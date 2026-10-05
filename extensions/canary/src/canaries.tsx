import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { getAccessToken, OAuthService, useCachedPromise, withAccessToken } from "@raycast/utils";

const github = OAuthService.github({
  scope: "repo read:org",
  personalAccessToken: getPreferenceValues<Prefs>().personalAccessToken || undefined,
});

interface Prefs {
  repo: string;
  urlPrefix?: string;
  extraUrlPrefix?: string;
  personalAccessToken?: string;
}

interface Matchers {
  urlPrefix: string;
  extraUrlPrefix: string;
}

interface PullRequest {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  headRefName: string;
  updatedAt: string;
  canaryUrl?: string;
  extraUrl?: string;
}

interface GqlComment {
  author: { login: string } | null;
  body: string;
}

interface GqlPr {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  headRefName: string;
  updatedAt: string;
  comments: { nodes: GqlComment[] };
}

const QUERY = `
query($q: String!) {
  search(query: $q, type: ISSUE, first: 40) {
    nodes {
      ... on PullRequest {
        number title url isDraft headRefName updatedAt
        comments(last: 40) { nodes { author { login } body } }
      }
    }
  }
}`;

export default withAccessToken(github)(Command);

function Command() {
  const { repo, urlPrefix = "", extraUrlPrefix = "" } = getPreferenceValues<Prefs>();
  const { data, isLoading, revalidate } = useCachedPromise(fetchPrs, [repo, { urlPrefix, extraUrlPrefix }]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter my PRs…">
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading pull requests…" : "No open pull requests"}
        description={isLoading ? undefined : `No open PRs authored by you in ${repo}`}
      />
      {(data ?? []).map((pr) => (
        <List.Item
          key={pr.number}
          title={pr.title}
          subtitle={`#${pr.number}`}
          keywords={[pr.headRefName]}
          icon={pr.isDraft ? { source: Icon.Circle, tintColor: Color.SecondaryText } : Icon.CircleProgress100}
          accessories={[
            pr.canaryUrl
              ? { tag: { value: "canary", color: Color.Green } }
              : { tag: { value: "no canary", color: Color.SecondaryText } },
            { date: new Date(pr.updatedAt) },
          ]}
          actions={
            <ActionPanel>
              {pr.canaryUrl && <Action.OpenInBrowser title="Open Canary" icon={Icon.Globe} url={pr.canaryUrl} />}
              <Action.OpenInBrowser
                title="Open Pull Request"
                icon={Icon.Code}
                url={pr.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              {pr.canaryUrl && (
                <Action.CopyToClipboard
                  title="Copy Canary URL"
                  icon={Icon.Clipboard}
                  content={pr.canaryUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              )}
              {pr.extraUrl && (
                <Action.OpenInBrowser
                  title="Open Extra Link"
                  icon={Icon.Link}
                  url={pr.extraUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function fetchPrs(repo: string, matchers: Matchers): Promise<PullRequest[]> {
  const [owner, name] = repo.split("/");
  const {
    data: { viewer, repository },
    errors,
  } = await graphql<{
    viewer: { login: string };
    repository: { nameWithOwner: string } | null;
  }>(
    "query($owner: String!, $name: String!) { viewer { login } repository(owner: $owner, name: $name) { nameWithOwner } }",
    { owner, name },
  );
  if (!repository) {
    throw new Error(
      `Signed in as ${viewer.login} (${getAccessToken().type === "personal" ? "personal access token" : "OAuth"}), but ${repo} is not visible. Check the repository name, and that the organization approved Raycast's GitHub OAuth app (or set a Personal Access Token in preferences).${errors.length ? ` GitHub said: ${errors.join("; ")}` : ""}`,
    );
  }
  const q = `is:pr is:open author:${viewer.login} repo:${repo} sort:updated-desc`;
  const { data } = await graphql<{ search: { nodes: GqlPr[] } }>(QUERY, { q });
  return data.search.nodes.filter((n) => n?.number).map((n) => toPullRequest(n, matchers));
}

async function graphql<T>(
  query: string,
  variables: Record<string, string> = {},
): Promise<{ data: T; errors: string[] }> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken().token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!json.data) throw new Error(json.errors?.map((e) => e.message).join("; ") ?? "GitHub API returned no data");
  return { data: json.data, errors: json.errors?.map((e) => e.message) ?? [] };
}

function toPullRequest(pr: GqlPr, matchers: Matchers): PullRequest {
  // Newest comment wins: a redeploy posts a fresh URL.
  const comments = [...pr.comments.nodes].reverse();
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    isDraft: pr.isDraft,
    headRefName: pr.headRefName,
    updatedAt: pr.updatedAt,
    canaryUrl: findUrl(comments, matchers.urlPrefix, /canary[^:\n]*:\s*(https?:\/\/[^\s)>\]]+)/i),
    extraUrl: matchers.extraUrlPrefix ? findUrl(comments, matchers.extraUrlPrefix) : undefined,
  };
}

function findUrl(commentsNewestFirst: GqlComment[], prefix: string, labelled?: RegExp): string | undefined {
  for (const { body } of commentsNewestFirst) {
    if (prefix) {
      const url = body.match(/https?:\/\/[^\s)>\]]+/g)?.find((u) => u.startsWith(prefix));
      if (url) return url;
    } else if (labelled) {
      const url = body.match(labelled)?.[1];
      if (url) return url;
    }
  }
  return undefined;
}
