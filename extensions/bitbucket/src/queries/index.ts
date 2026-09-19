import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Bitbucket, Schema } from "bitbucket";
import { preferences } from "../helpers/preferences";
import { URLSearchParams } from "url";

const clientOptions = {
  baseUrl: "https://api.bitbucket.org/2.0",
  auth: {
    username: preferences.email,
    password: preferences.apiToken,
  },
  notice: false,
};

const defaults = {
  workspace: preferences.workspace,
};

const bitbucket = new Bitbucket(clientOptions);

export async function getRepositoriesLazy(path: string) {
  const params = new URLSearchParams(path.split("?")[1]);
  const page = params.get("page") ?? "1";
  const q = params.get("query");

  const { data } = await bitbucket.repositories
    .list({
      ...defaults,
      pagelen: 100,
      sort: "-updated_on",
      page,
      ...(q ? { q: `name ~ "${q}" OR description ~ "${q}"` } : {}),
      fields: [
        "values.name",
        "values.uuid",
        "values.slug",
        "values.full_name",
        "values.links.avatar.href",
        "values.links.clone",
        "values.description",
        "values.created_on",
        "next",
      ].join(","),
    })
    .catch(() => {
      return { data: { values: [] as Schema.Repository[] }, status: 500 };
    });

  return data.values as Schema.Repository[];
}

export async function pipelinesGetQuery(repoSlug: string, pageNumber: number) {
  return await bitbucket.pipelines.list({
    ...defaults,
    repo_slug: repoSlug,
    pagelen: 15,
    page: pageNumber + "",
    sort: "-created_on",
    // https://developer.atlassian.com/cloud/bitbucket/rest/intro/#fields-parameter-syntax
    // "+": Pulling in additional fields not normally returned by an endpoint, while still getting all the default fields
    fields: [
      "+values.target.commit.message",
      "values.uuid",
      "+values.target.selector.type+values.target.selector.pattern+values.target.commit.summary.html",
      "+values.target.*",
      "+values.*",
      "+page",
      "+size",
    ].join(","),
  });
}

export async function pullRequestsGetQuery(repoSlug: string) {
  return await bitbucket.pullrequests.list({
    ...defaults,
    repo_slug: repoSlug,
    pagelen: 20,
    sort: "-created_on",
  });
}

export async function getCommitNames(repoSlug: string) {
  return await bitbucket.pipelines.list({
    ...defaults,
    pagelen: 20,
    sort: "-created_on",
    repo_slug: repoSlug,
  });
}

async function getCurrentUserUuid(): Promise<string> {
  const key = `me-uuid:${preferences.email}`;
  const stored = await LocalStorage.getItem<string>(key);
  if (stored) {
    return stored;
  }

  const response = await bitbucket.user.get({});
  if (response.status >= 400) {
    throw new Error(`Unable to get current user: status ${response.status}`);
  }

  const uuid = response.data.uuid;
  if (typeof uuid !== "string") {
    throw new Error("Unable to get current user: no uuid in response");
  }

  await LocalStorage.setItem(key, uuid);
  return uuid;
}

type OpenPullRequest = {
  id: number;
  title: string;
  comment_count: number;
  created_on?: string;
  author: {
    nickname: string;
    links: {
      avatar: { href: string };
    };
  };
  destination: {
    repository: {
      name: string;
      full_name: string;
    };
  };
};

const REPO_CONCURRENCY = 10;
const REPO_LIST_TTL_MS = 10 * 60 * 1000;

type RepoWithSlug = Schema.Repository & { slug: string; updated_on?: string };

// maxRepoAgeDays only exists on the two commands that scan repos (not on the shared
// ExtensionPreferences), so it's read here with its proper per-command generated type
// instead of being force-added to the shared `preferences` object.
type RepoScanPreferences = Preferences.SearchAllPullRequests | Preferences.SearchMyOpenPullRequests;

function maxRepoAgeDaysRaw(): string {
  return getPreferenceValues<RepoScanPreferences>().maxRepoAgeDays;
}

function repoListCacheKey(): string {
  return `repos:${preferences.workspace}:${preferences.email}:${maxRepoAgeDaysRaw() || "0"}`;
}

// 0 (or unset) means no limit: scan every repository.
function maxRepoAgeMs(): number | undefined {
  const raw = maxRepoAgeDaysRaw()?.trim();
  if (!raw) {
    return undefined;
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error(`"Max Repository Age (Days)" must be a whole number, got "${raw}"`);
  }

  const days = Number(raw);
  return days > 0 ? days * 24 * 60 * 60 * 1000 : undefined;
}

async function getCachedRepositories(): Promise<RepoWithSlug[] | undefined> {
  const stored = await LocalStorage.getItem<string>(repoListCacheKey());
  if (!stored) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(stored) as { fetchedAt: number; repos: RepoWithSlug[] };
    if (Date.now() - parsed.fetchedAt > REPO_LIST_TTL_MS) {
      return undefined;
    }
    return parsed.repos;
  } catch {
    return undefined;
  }
}

async function setCachedRepositories(repos: RepoWithSlug[]): Promise<void> {
  await LocalStorage.setItem(repoListCacheKey(), JSON.stringify({ fetchedAt: Date.now(), repos }));
}

// Repos are sorted -updated_on. When maxRepoAgeDays is set, stop paginating as soon as a
// repo older than the cutoff is seen instead of scanning the whole workspace. Yields pages
// as they arrive so callers can start PR-fetching before later pages have loaded.
async function* iterateAllRepositories(): AsyncGenerator<RepoWithSlug[]> {
  const cutoff = maxRepoAgeMs();
  const cutoffTime = cutoff !== undefined ? Date.now() - cutoff : undefined;
  let page = "1";

  for (;;) {
    const { data } = await bitbucket.repositories.list({
      ...defaults,
      pagelen: 100,
      sort: "-updated_on",
      page,
      fields: ["values.slug", "values.name", "values.full_name", "values.updated_on", "next"].join(","),
    });

    const values = ((data.values as RepoWithSlug[]) ?? []).filter(
      (repo): repo is RepoWithSlug => typeof repo.slug === "string",
    );

    let hitStale = false;
    const pageRepos: RepoWithSlug[] = [];
    for (const repo of values) {
      if (cutoffTime !== undefined) {
        const updatedAt = repo.updated_on ? Date.parse(repo.updated_on) : undefined;
        if (updatedAt !== undefined && updatedAt < cutoffTime) {
          hitStale = true;
          break;
        }
      }
      pageRepos.push(repo);
    }

    if (pageRepos.length > 0) {
      yield pageRepos;
    }

    if (hitStale || !data.next) {
      break;
    }

    const nextParams = new URLSearchParams(data.next.split("?")[1]);
    page = nextParams.get("page") ?? String(Number(page) + 1);
  }
}

async function listOpenPullRequestsForRepo(
  repo: {
    slug: string;
    name?: string;
    full_name?: string;
  },
  // Matches the scope of Bitbucket's removed workspace-wide "PRs for a user" endpoint:
  // PRs the user authored OR is a requested reviewer on, not just authored ones.
  involvedUuid?: string,
): Promise<OpenPullRequest[]> {
  const pullRequests: OpenPullRequest[] = [];
  let page = "1";

  for (;;) {
    const { data } = await bitbucket.pullrequests.list({
      ...defaults,
      repo_slug: repo.slug,
      pagelen: 50,
      page,
      sort: "-created_on",
      state: "OPEN",
      ...(involvedUuid ? { q: `(author.uuid="${involvedUuid}" OR reviewers.uuid="${involvedUuid}")` } : {}),
      fields: [
        "values.id",
        "values.title",
        "values.comment_count",
        "values.created_on",
        "values.author.nickname",
        "values.author.links.avatar.href",
        "values.destination.repository.name",
        "values.destination.repository.full_name",
        "next",
      ].join(","),
    });

    for (const pr of data.values ?? []) {
      const author = pr.author as { nickname?: string; links?: { avatar?: { href?: string } } } | undefined;
      if (typeof pr.id !== "number" || typeof pr.title !== "string" || typeof author?.nickname !== "string") {
        continue;
      }

      pullRequests.push({
        id: pr.id,
        title: pr.title,
        comment_count: (pr.comment_count as number) ?? 0,
        created_on: pr.created_on,
        author: {
          nickname: author.nickname,
          links: {
            avatar: {
              href: author.links?.avatar?.href ?? "",
            },
          },
        },
        destination: {
          repository: {
            name: (pr.destination?.repository?.name as string) ?? repo.name ?? repo.slug,
            full_name:
              (pr.destination?.repository?.full_name as string) ??
              repo.full_name ??
              `${preferences.workspace}/${repo.slug}`,
          },
        },
      });
    }

    if (!data.next) {
      break;
    }

    const nextParams = new URLSearchParams(data.next.split("?")[1]);
    page = nextParams.get("page") ?? String(Number(page) + 1);
  }

  return pullRequests;
}

// Repos are pushed as they're discovered (instantly from cache, or page-by-page from the
// API) while a fixed pool of workers drains the queue, so PR fetches for early repos
// overlap with later repo-list pages still loading instead of waiting on the full list.
class RepoQueue {
  private pending: RepoWithSlug[] = [];
  private waiters: ((repo: RepoWithSlug | undefined) => void)[] = [];
  private closed = false;

  push(repo: RepoWithSlug) {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(repo);
    } else {
      this.pending.push(repo);
    }
  }

  close() {
    this.closed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()?.(undefined);
    }
  }

  next(): Promise<RepoWithSlug | undefined> {
    if (this.pending.length > 0) {
      return Promise.resolve(this.pending.shift());
    }
    if (this.closed) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}

export type OpenPullRequestsResult = { values: OpenPullRequest[]; failedRepoCount: number };

const PROGRESS_EMIT_INTERVAL_MS = 200;

// Bitbucket has no workspace-wide PR endpoint; iterate repos then fetch open PRs per repo
// (optionally server-side filtered to one author via fetchForRepo). Repos are sorted
// -updated_on, so onProgress lets callers render the most-active repos' PRs as soon as
// they land instead of waiting for every repo to finish.
async function scanOpenPullRequests(
  fetchForRepo: (repo: RepoWithSlug) => Promise<OpenPullRequest[]>,
  onProgress?: (partial: OpenPullRequestsResult) => void,
): Promise<OpenPullRequestsResult> {
  const collected: OpenPullRequest[] = [];
  let failedRepoCount = 0;
  let lastEmit = 0;

  const snapshot = (): OpenPullRequestsResult => {
    const values = [...collected].sort((a, b) => {
      const aTime = a.created_on ? Date.parse(a.created_on) : 0;
      const bTime = b.created_on ? Date.parse(b.created_on) : 0;
      return bTime - aTime;
    });
    return { values, failedRepoCount };
  };

  const queue = new RepoQueue();

  const feedRepos = async () => {
    const cached = await getCachedRepositories();
    if (cached) {
      for (const repo of cached) {
        queue.push(repo);
      }
      queue.close();
      return;
    }

    const fetched: RepoWithSlug[] = [];
    for await (const page of iterateAllRepositories()) {
      for (const repo of page) {
        fetched.push(repo);
        queue.push(repo);
      }
    }
    queue.close();
    try {
      await setCachedRepositories(fetched);
    } catch (error) {
      console.error("[bitbucket] Failed to persist repository list cache:", error);
    }
  };

  const worker = async () => {
    for (;;) {
      const repo = await queue.next();
      if (!repo) {
        break;
      }

      try {
        collected.push(...(await fetchForRepo(repo)));
      } catch (error) {
        failedRepoCount += 1;
        const status = (error as { status?: number } | undefined)?.status;
        console.error(`[bitbucket] PR fetch failed for ${repo.full_name ?? repo.slug} (status ${status ?? "?"})`);
      }

      const now = Date.now();
      if (onProgress && now - lastEmit >= PROGRESS_EMIT_INTERVAL_MS) {
        lastEmit = now;
        onProgress(snapshot());
      }
    }
  };

  await Promise.all([feedRepos(), ...Array.from({ length: REPO_CONCURRENCY }, () => worker())]);

  return snapshot();
}

export async function getAllOpenPullRequests(
  onProgress?: (partial: OpenPullRequestsResult) => void,
): Promise<OpenPullRequestsResult> {
  return scanOpenPullRequests((repo) => listOpenPullRequestsForRepo(repo), onProgress);
}

// Bitbucket removed its workspace-wide "PRs for a user" endpoint (the one path segment
// away from just being a filter): https://community.atlassian.com/forums/Bitbucket-articles/Reminder-List-pull-requests-for-a-user-API-removal/ba-p/2935311
// so "my open PRs" reuses the same per-repo scan as getAllOpenPullRequests, with the
// author-or-reviewer filter applied server-side per repo via the `q` query param.
export async function getMyOpenPullRequests(
  onProgress?: (partial: OpenPullRequestsResult) => void,
): Promise<OpenPullRequestsResult> {
  const uuid = await getCurrentUserUuid();
  return scanOpenPullRequests((repo) => listOpenPullRequestsForRepo(repo, uuid), onProgress);
}
