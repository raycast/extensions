import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Bitbucket, Schema } from "bitbucket";
import { preferences } from "../helpers/preferences";
import { extractPendingReviewerUuids, extractReviewers, Reviewer } from "../helpers/reviewers";
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
    // List endpoints omit `participants` by default (performance) — `+` adds it
    // to the default field set instead of restricting the response to just this.
    fields: "+values.participants",
  });
}

export async function getPullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.get({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function approvePullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.createApproval({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function declinePullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.decline({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function unapprovePullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.deleteApproval({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function requestChangesOnPullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.addChangeRequest({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function undoRequestChangesOnPullRequest(repoSlug: string, pullRequestId: number) {
  return await bitbucket.pullrequests.deleteChangeRequest({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
  });
}

export async function addPullRequestComment(repoSlug: string, pullRequestId: number, comment: string) {
  return await bitbucket.pullrequests.createComment({
    ...defaults,
    repo_slug: repoSlug,
    pull_request_id: pullRequestId,
    _body: { type: "pullrequest_comment", content: { raw: comment } },
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

// Bitbucket removed its workspace-wide "PRs for a user" endpoint (see getMyOpenPullRequests
// below), so this is the only place that still needs the current user's identity — just
// the uuid, used to filter each repo's PR list server-side.
export async function getCurrentUserUuid(): Promise<string> {
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
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
  comment_count: number;
  created_on?: string;
  updated_on?: string;
  reviewers: Reviewer[];
  // Uuids of reviewers who were asked to review but haven't approved / requested changes yet.
  pendingReviewerUuids: string[];
  author: {
    nickname: string;
    uuid?: string;
    links: {
      avatar: { href: string };
    };
  };
  destination: {
    repository: {
      name: string;
      full_name: string;
      slug: string;
    };
  };
};

const REPO_CONCURRENCY = 10;
const REPO_LIST_TTL_MS = 10 * 60 * 1000;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

function isRetryableStatus(status: number | undefined): boolean {
  return status === 429 || (status !== undefined && status >= 500);
}

// Bitbucket's own retry-after (in seconds) takes priority over our own backoff guess,
// since it tells us exactly how long the current rate-limit window has left.
function retryDelayMs(error: unknown, attempt: number): number {
  const headers = (error as { headers?: Record<string, string> } | undefined)?.headers;
  const retryAfterHeader = headers?.["retry-after"] ?? headers?.["Retry-After"];
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  if (retryAfterSeconds !== undefined && !Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

// Retries a single Bitbucket request on 429/5xx instead of letting one rate-limited
// call permanently drop a repo's PRs (or the whole repo list) from the results.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as { status?: number } | undefined)?.status;
      if (attempt >= MAX_RETRIES || !isRetryableStatus(status)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(error, attempt)));
    }
  }
}

type RepoWithSlug = Schema.Repository & { slug: string; updated_on?: string };

// maxRepoAgeDays only exists on the two commands that scan repos (not on the shared
// ExtensionPreferences), so it's read here with its proper per-command generated type
// instead of being force-added to the shared `preferences` object.
type RepoScanPreferences =
  | Preferences.SearchAllPullRequests
  | Preferences.SearchMyOpenPullRequests
  | Preferences.Notifications;

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
    const { data } = await withRetry(() =>
      bitbucket.repositories.list({
        ...defaults,
        pagelen: 100,
        sort: "-updated_on",
        page,
        fields: ["values.slug", "values.name", "values.full_name", "values.updated_on", "next"].join(","),
      }),
    );

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
  const seenIds = new Set<number>();
  let page = "1";

  // Bitbucket's `page` param is an offset, not a stable cursor. On a repo with PRs
  // opened continuously during the scan, new PRs pushed to the front shift already-seen
  // PRs into the next page's offset window, re-returning them (or, in the worst case,
  // never satisfying `!data.next`). Cap total pages and stop as soon as a page adds
  // nothing new, instead of risking an unbounded loop and memory growth.
  const MAX_PR_PAGES = 40;
  for (let pageCount = 0; pageCount < MAX_PR_PAGES; pageCount++) {
    const { data } = await withRetry(() =>
      bitbucket.pullrequests.list({
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
          "values.updated_on",
          "values.author.nickname",
          "values.author.uuid",
          "values.author.links.avatar.href",
          "values.destination.repository.name",
          "values.destination.repository.full_name",
          "values.participants.state",
          "values.participants.role",
          "values.participants.user.nickname",
          "values.participants.user.uuid",
          "next",
        ].join(","),
      }),
    );

    let newInThisPage = 0;
    for (const pr of data.values ?? []) {
      const author = pr.author as
        | { nickname?: string; uuid?: string; links?: { avatar?: { href?: string } } }
        | undefined;
      if (typeof pr.id !== "number" || typeof pr.title !== "string" || typeof author?.nickname !== "string") {
        continue;
      }

      // The `page` param is an offset, not a stable cursor: a PR opened on this repo
      // mid-scan shifts already-seen PRs into the next page's window, re-returning them.
      if (seenIds.has(pr.id)) {
        continue;
      }
      seenIds.add(pr.id);
      newInThisPage++;

      pullRequests.push({
        id: pr.id,
        title: pr.title,
        state: (pr.state as OpenPullRequest["state"]) ?? "OPEN",
        comment_count: (pr.comment_count as number) ?? 0,
        created_on: pr.created_on,
        updated_on: pr.updated_on,
        reviewers: extractReviewers(pr.participants as Schema.Participant[] | undefined),
        pendingReviewerUuids: extractPendingReviewerUuids(pr.participants as Schema.Participant[] | undefined),
        author: {
          nickname: author.nickname,
          uuid: author.uuid,
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
            slug: (pr.destination?.repository?.slug as string) ?? repo.slug,
          },
        },
      });
    }

    if (!data.next || newInThisPage === 0) {
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

export type ScanResult<T> = { values: T[]; failedRepoCount: number };
export type OpenPullRequestsResult = ScanResult<OpenPullRequest>;

const PROGRESS_EMIT_INTERVAL_MS = 200;

// Bitbucket has no workspace-wide PR endpoint; iterate repos then fetch open PRs per repo
// (optionally server-side filtered to one author via fetchForRepo). Repos are sorted
// -updated_on, so onProgress lets callers render the most-active repos' PRs as soon as
// they land instead of waiting for every repo to finish.
async function scanOpenPullRequests<T extends { created_on?: string }>(
  fetchForRepo: (repo: RepoWithSlug) => Promise<T[]>,
  onProgress?: (partial: ScanResult<T>) => void,
): Promise<ScanResult<T>> {
  const collected: T[] = [];
  let failedRepoCount = 0;
  let lastEmit = 0;

  const snapshot = (): ScanResult<T> => {
    const values = [...collected].sort((a, b) => {
      const aTime = a.created_on ? Date.parse(a.created_on) : 0;
      const bTime = b.created_on ? Date.parse(b.created_on) : 0;
      return bTime - aTime;
    });
    return { values, failedRepoCount };
  };

  const queue = new RepoQueue();

  const feedRepos = async () => {
    // Preference reads (e.g. an invalid maxRepoAgeDays) or a repo-listing API call can
    // throw before every repo is queued — queue.close() must still run so the worker
    // pool's `queue.next()` calls settle instead of hanging until the process exits.
    try {
      const cached = await getCachedRepositories();
      if (cached) {
        for (const repo of cached) {
          queue.push(repo);
        }
        return;
      }

      const fetched: RepoWithSlug[] = [];
      const seenSlugs = new Set<string>();
      for await (const page of iterateAllRepositories()) {
        for (const repo of page) {
          // Sorting by -updated_on while paginating a live, actively-pushed workspace can
          // shift a repo's rank between page fetches, causing it to reappear on a later
          // page. De-dupe by slug so its PRs aren't fetched (and shown) twice.
          if (seenSlugs.has(repo.slug)) {
            continue;
          }
          seenSlugs.add(repo.slug);
          fetched.push(repo);
          queue.push(repo);
        }
      }

      try {
        await setCachedRepositories(fetched);
      } catch (error) {
        console.error("[bitbucket] Failed to persist repository list cache:", error);
      }
    } finally {
      queue.close();
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

export type NotificationEventKind = "comment" | "mention" | "pr_merged" | "pr_declined" | "pipeline_failed";

export interface NotificationEvent {
  id: string;
  kind: NotificationEventKind;
  created_on: string;
  repoName: string;
  actor?: string;
  title: string;
  url: string;
}

const REQUEST_BASE = "https://api.bitbucket.org/2.0";
const MAX_EVENT_PAGES = 10;

async function apiGet<T>(url: string): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${preferences.email}:${preferences.apiToken}`).toString("base64")}`,
        Accept: "application/json",
      },
      // A dropped connection ("fetch failed") has no status; treat it like a transient 503 so it's retried.
    }).catch((error: Error) => {
      throw Object.assign(error, { status: 503 });
    });
    if (!response.ok) {
      throw Object.assign(new Error(`Bitbucket request failed: ${response.status}`), {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }
    return (await response.json()) as T;
  });
}

type Paged<T> = { values?: T[]; next?: string };

// Follows `next` links so activity isn't capped at the first page. `isPastWindow` lets callers
// whose endpoint can't filter by date server-side stop as soon as a page reaches older items.
async function apiGetAll<T>(
  path: string,
  params: Record<string, string>,
  isPastWindow?: (item: T) => boolean,
): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = `${REQUEST_BASE}${path}?${new URLSearchParams(params).toString()}`;

  for (let page = 0; url && page < MAX_EVENT_PAGES; page++) {
    const data: Paged<T> = await apiGet<Paged<T>>(url);
    const values = data.values ?? [];
    items.push(...values);
    if (isPastWindow && values.some(isPastWindow)) {
      break;
    }
    url = data.next;
  }

  return items;
}

type ClosedPullRequest = {
  id: number;
  title: string;
  state: string;
  updated_on: string;
  links?: { html?: { href?: string } };
};

type PullRequestComment = {
  id: number;
  created_on: string;
  content?: { raw?: string };
  user?: { uuid?: string; nickname?: string };
  deleted?: boolean;
  pullrequest?: { id: number; title: string; author?: { uuid?: string } };
  links?: { html?: { href?: string } };
};

type PipelineRun = {
  uuid: string;
  build_number: number;
  created_on: string;
  creator?: { uuid?: string };
  state?: { result?: { name?: string } };
  target?: { ref_name?: string };
};

function listClosedPullRequests(repoPath: string, myUuid: string, since: string) {
  // The `state` query param doesn't reliably restrict the list (open PRs leaked into the results),
  // so the states are part of the query filter instead.
  return apiGetAll<ClosedPullRequest>(`${repoPath}/pullrequests`, {
    q: `(state="MERGED" OR state="DECLINED") AND author.uuid="${myUuid}" AND updated_on>${JSON.stringify(since)}`,
    sort: "-updated_on",
    pagelen: "50",
    fields: "values.id,values.title,values.state,values.updated_on,values.links.html.href,next",
  });
}

// Bitbucket has no repo-wide comments endpoint, so comments are read per pull request. The caller
// passes the open PRs you authored or review that changed within the window (a new comment bumps
// updated_on), which the PR scan already fetched, so no extra list request is needed here.
type CommentTarget = { id: number; title: string; author?: { uuid?: string } };

async function listComments(
  repoPath: string,
  since: string,
  pullRequests: CommentTarget[],
): Promise<PullRequestComment[]> {
  const comments: PullRequestComment[] = [];
  // Sequential on purpose: the repo scan is already concurrent and parallel bursts drop connections.
  for (const pr of pullRequests) {
    const prComments = await apiGetAll<PullRequestComment>(`${repoPath}/pullrequests/${pr.id}/comments`, {
      q: `created_on>${JSON.stringify(since)}`,
      sort: "-created_on",
      pagelen: "50",
      fields: [
        "values.id",
        "values.created_on",
        "values.deleted",
        "values.content.raw",
        "values.user.uuid",
        "values.user.nickname",
        "values.links.html.href",
        "next",
      ].join(","),
    });
    comments.push(...prComments.map((c) => ({ ...c, pullrequest: pr })));
  }
  return comments;
}

// The pipelines endpoint can't filter by date or creator, so page through the newest runs
// (all users) until the lookback window is covered.
function listPipelines(repoPath: string, since: string) {
  return apiGetAll<PipelineRun>(
    `${repoPath}/pipelines`,
    {
      sort: "-created_on",
      pagelen: "50",
      fields:
        "values.uuid,values.build_number,values.created_on,values.creator.uuid,values.state.result.name,values.target.ref_name,next",
    },
    (run) => run.created_on < since,
  );
}

type RepoEvents = { events: NotificationEvent[]; failedSources: number };

async function listNotificationEventsForRepo(
  repo: RepoWithSlug,
  myUuid: string,
  since: string,
  involvedPullRequests: CommentTarget[],
): Promise<RepoEvents> {
  const repoPath = `/repositories/${preferences.workspace}/${repo.slug}`;
  const repoName = repo.name ?? repo.slug;
  const prUrl = (id: number) => `https://bitbucket.org/${preferences.workspace}/${repo.slug}/pull-requests/${id}`;
  const events: NotificationEvent[] = [];

  // Sources fail independently (e.g. a token without pipeline scope shouldn't hide comments) and
  // run one after another to keep the number of concurrent connections down.
  const settle = async <T>(name: string, fn: () => Promise<T>): Promise<PromiseSettledResult<T>> => {
    try {
      return { status: "fulfilled", value: await fn() };
    } catch (reason) {
      console.error(`[bitbucket] ${name} failed for ${repo.slug}:`, (reason as Error)?.message);
      return { status: "rejected", reason };
    }
  };
  const comments = await settle("comments", () => listComments(repoPath, since, involvedPullRequests));
  const closed = await settle("closed pull requests", () => listClosedPullRequests(repoPath, myUuid, since));
  const pipelines = await settle("pipelines", () => listPipelines(repoPath, since));
  const settled = [comments, closed, pipelines];
  const failedSources = settled.filter((r) => r.status === "rejected").length;
  if (failedSources === settled.length) {
    throw (comments as PromiseRejectedResult).reason;
  }

  if (comments.status === "fulfilled") {
    for (const c of comments.value) {
      if (c.deleted || !c.pullrequest || c.user?.uuid === myUuid) continue;
      const mentioned = c.content?.raw?.includes(myUuid) ?? false;
      if (!mentioned && c.pullrequest.author?.uuid !== myUuid) continue;
      events.push({
        id: `comment:${repo.slug}:${c.id}`,
        kind: mentioned ? "mention" : "comment",
        created_on: c.created_on,
        repoName,
        actor: c.user?.nickname,
        title: `${c.user?.nickname ?? "Someone"} ${mentioned ? "mentioned you" : "commented"} on "${c.pullrequest.title}"`,
        url: c.links?.html?.href ?? prUrl(c.pullrequest.id),
      });
    }
  }

  if (closed.status === "fulfilled") {
    for (const pr of closed.value) {
      if (pr.state !== "MERGED" && pr.state !== "DECLINED") continue;
      events.push({
        id: `pr:${repo.slug}:${pr.id}:${pr.state}`,
        kind: pr.state === "MERGED" ? "pr_merged" : "pr_declined",
        created_on: pr.updated_on,
        repoName,
        title: `Your pull request "${pr.title}" was ${pr.state === "MERGED" ? "merged" : "declined"}`,
        url: pr.links?.html?.href ?? prUrl(pr.id),
      });
    }
  }

  if (pipelines.status === "fulfilled") {
    for (const run of pipelines.value) {
      const result = run.state?.result?.name;
      if (run.creator?.uuid !== myUuid || run.created_on < since) continue;
      if (result !== "FAILED" && result !== "ERROR") continue;
      events.push({
        id: `pipeline:${repo.slug}:${run.uuid}`,
        kind: "pipeline_failed",
        created_on: run.created_on,
        repoName,
        title: `Pipeline #${run.build_number} failed${run.target?.ref_name ? ` on ${run.target.ref_name}` : ""}`,
        url: `https://bitbucket.org/${preferences.workspace}/${repo.slug}/pipelines/results/${run.build_number}`,
      });
    }
  }

  return { events, failedSources };
}

// Bitbucket Cloud has no notifications API, so events are derived from per-repo activity
// (PR comments / mentions, your merged or declined PRs, your failed pipelines).
// `failedRepoCount` counts repos where at least one source failed, so callers can flag
// an incomplete refresh instead of showing it as "no notifications".
export const NOTIFICATION_LOOKBACK_DAYS = 7;

export async function getNotificationEvents(
  openPullRequests: OpenPullRequest[],
  lookbackDays = NOTIFICATION_LOOKBACK_DAYS,
): Promise<ScanResult<NotificationEvent>> {
  const uuid = await getCurrentUserUuid();
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  let partialFailures = 0;

  // Reuse the PR scan the caller already did (your PRs / PRs you review) for the comment lookups.
  const involvedByRepo = new Map<string, CommentTarget[]>();
  for (const pr of openPullRequests) {
    if (!pr.updated_on || pr.updated_on < since) continue;
    const slug = pr.destination.repository.slug;
    involvedByRepo.set(slug, [...(involvedByRepo.get(slug) ?? []), pr]);
  }

  const result = await scanOpenPullRequests(async (repo) => {
    const { events, failedSources } = await listNotificationEventsForRepo(
      repo,
      uuid,
      since,
      involvedByRepo.get(repo.slug) ?? [],
    );
    if (failedSources > 0) {
      partialFailures += 1;
    }
    return events;
  });

  // Offset-based pagination can return an item twice when activity shifts pages mid-scan.
  const values = [...new Map(result.values.map((event) => [event.id, event])).values()];
  return { values, failedRepoCount: result.failedRepoCount + partialFailures };
}
