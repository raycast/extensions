import { LocalStorage } from "@raycast/api";
import { Bitbucket, Schema } from "bitbucket";
import { preferences } from "../helpers/preferences";
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

async function getUsername() {
  const key = `me:${preferences.email}`;
  const stored = await LocalStorage.getItem<string>(key);
  if (stored) {
    return stored;
  }

  const response = await bitbucket.user.get({});
  if (response.status >= 400) {
    throw new Error(`Unable to get username: status ${response.status}`);
  }

  const result = response.data.username;
  if (typeof result !== "string") {
    throw new Error("Unable to get username: no username in response");
  }

  await LocalStorage.setItem(key, result);
  return result;
}

const PullRequestsResponseSchema = z.object({
  values: z.array(
    z.object({
      id: z.number(),
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
        }),
      }),
      comment_count: z.number(),
    }),
  ),
});

// We can't use the Bitbucket package for this, as it doesn't support this endpoint
// We can't use listPullrequestsForUser, as this has been removed: https://community.atlassian.com/forums/Bitbucket-articles/Reminder-List-pull-requests-for-a-user-API-removal/ba-p/2935311
export async function getMyOpenPullRequests() {
  const response = await fetch(
    `https://api.bitbucket.org/2.0/workspaces/${preferences.workspace}/pullrequests/${await getUsername()}?pagelen=20&sort=-created_on&state=OPEN`,
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

// Bitbucket has no workspace-wide PR endpoint; iterate repos then fetch open PRs per repo.
export async function getAllOpenPullRequests() {
  const repos = (await listAllRepositories()).filter(
    (repo): repo is Schema.Repository & { slug: string } => typeof repo.slug === "string",
  );

  const perRepo = await mapWithConcurrency(repos, 10, async (repo) => {
    try {
      return { ok: true as const, values: await listOpenPullRequestsForRepo(repo) };
    } catch {
      return { ok: false as const, values: [] as OpenPullRequest[] };
    }
  });

  const failedRepoCount = perRepo.filter((result) => !result.ok).length;
  const all = perRepo.flatMap((result) => result.values);

  all.sort((a, b) => {
    const aTime = a.created_on ? Date.parse(a.created_on) : 0;
    const bTime = b.created_on ? Date.parse(b.created_on) : 0;
    return bTime - aTime;
  });

  return { values: all, failedRepoCount };
}
