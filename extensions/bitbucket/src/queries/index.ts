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
