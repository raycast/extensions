import { LocalStorage } from "@raycast/api";
import { Bitbucket, Schema } from "bitbucket";
import { preferences } from "../helpers/preferences";
import { extractReviewers, Reviewer } from "../helpers/reviewers";
import { URLSearchParams } from "url";
import { z } from "zod";

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

interface CachedUser {
  username: string;
  uuid: string;
}

async function getCurrentUser(): Promise<CachedUser> {
  const key = `me:${preferences.email}`;
  const stored = await LocalStorage.getItem<string>(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<CachedUser>;
      if (typeof parsed.username === "string" && typeof parsed.uuid === "string") {
        return parsed as CachedUser;
      }
    } catch {
      // stale cache format from before uuid tracking — fall through and refetch
    }
  }

  const response = await bitbucket.user.get({});
  if (response.status >= 400) {
    throw new Error(`Unable to get current user: status ${response.status}`);
  }

  const { username, uuid } = response.data;
  if (typeof username !== "string" || typeof uuid !== "string") {
    throw new Error("Unable to get current user: missing username or uuid in response");
  }

  const user: CachedUser = { username, uuid };
  await LocalStorage.setItem(key, JSON.stringify(user));
  return user;
}

export async function getCurrentUserUuid(): Promise<string> {
  return (await getCurrentUser()).uuid;
}

const PullRequestsResponseSchema = z.object({
  values: z.array(
    z.object({
      id: z.number(),
      state: z.enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"]),
      author: z.object({
        nickname: z.string(),
        links: z.object({
          avatar: z.object({ href: z.string() }),
        }),
      }),
      title: z.string(),
      destination: z.object({
        repository: z.object({
          name: z.string(),
          full_name: z.string(),
          slug: z.string(),
        }),
      }),
      comment_count: z.number(),
      participants: z
        .array(
          z.object({
            state: z.enum(["approved", "changes_requested"]).nullable().optional(),
            user: z.object({ nickname: z.string().optional(), uuid: z.string().optional() }).optional(),
          }),
        )
        .optional(),
    }),
  ),
});

// We can't use the Bitbucket package for this, as it doesn't support this endpoint
// We can't use listPullrequestsForUser, as this has been removed: https://community.atlassian.com/forums/Bitbucket-articles/Reminder-List-pull-requests-for-a-user-API-removal/ba-p/2935311
export async function getMyOpenPullRequests() {
  const response = await fetch(
    // List endpoints omit `participants` by default (performance) — `+` adds it
    // to the default field set instead of restricting the response to just this.
    `https://api.bitbucket.org/2.0/workspaces/${preferences.workspace}/pullrequests/${(await getCurrentUser()).username}?pagelen=20&sort=-created_on&state=OPEN&fields=${encodeURIComponent("+values.participants,+values.destination.repository.slug")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${preferences.email}:${preferences.apiToken}`).toString("base64")}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Error fetching pull requests: ${response.status} (${response.statusText})`);
  }

  return PullRequestsResponseSchema.parse(await response.json()).values;
}

type OpenPullRequest = z.infer<typeof PullRequestsResponseSchema>["values"][number] & {
  created_on?: string;
  reviewers: Reviewer[];
};

async function listAllRepositories(): Promise<Schema.Repository[]> {
  const repos: Schema.Repository[] = [];
  let page = "1";

  for (;;) {
    const { data } = await bitbucket.repositories.list({
      ...defaults,
      pagelen: 100,
      sort: "-updated_on",
      page,
      fields: ["values.slug", "values.name", "values.full_name", "next"].join(","),
    });

    repos.push(...((data.values as Schema.Repository[]) ?? []));

    if (!data.next) {
      break;
    }

    const nextParams = new URLSearchParams(data.next.split("?")[1]);
    page = nextParams.get("page") ?? String(Number(page) + 1);
  }

  return repos;
}

async function listOpenPullRequestsForRepo(repo: {
  slug: string;
  name?: string;
  full_name?: string;
}): Promise<OpenPullRequest[]> {
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
      fields: [
        "values.id",
        "values.title",
        "values.comment_count",
        "values.created_on",
        "values.author.nickname",
        "values.author.links.avatar.href",
        "values.destination.repository.name",
        "values.destination.repository.full_name",
        "values.participants.state",
        "values.participants.user.nickname",
        "values.participants.user.uuid",
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
        state: (pr.state as OpenPullRequest["state"]) ?? "OPEN",
        comment_count: (pr.comment_count as number) ?? 0,
        created_on: pr.created_on,
        reviewers: extractReviewers(pr.participants as Schema.Participant[] | undefined),
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
            slug: (pr.destination?.repository?.slug as string) ?? repo.slug,
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export type OpenPullRequestsResult = { values: OpenPullRequest[]; failedRepoCount: number };

const PROGRESS_EMIT_INTERVAL_MS = 200;

// Bitbucket has no workspace-wide PR endpoint; iterate repos then fetch open PRs per repo.
// Repos are sorted -updated_on, so onProgress lets callers render the most-active repos'
// PRs as soon as they land instead of waiting for every repo to finish.
export async function getAllOpenPullRequests(
  onProgress?: (partial: OpenPullRequestsResult) => void,
): Promise<OpenPullRequestsResult> {
  const repos = (await listAllRepositories()).filter(
    (repo): repo is Schema.Repository & { slug: string } => typeof repo.slug === "string",
  );

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

  await mapWithConcurrency(repos, 10, async (repo) => {
    try {
      collected.push(...(await listOpenPullRequestsForRepo(repo)));
    } catch {
      failedRepoCount += 1;
    }

    const now = Date.now();
    if (onProgress && now - lastEmit >= PROGRESS_EMIT_INTERVAL_MS) {
      lastEmit = now;
      onProgress(snapshot());
    }
  });

  return snapshot();
}
