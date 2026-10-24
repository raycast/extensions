import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { getAccessToken, OAuthService, useCachedPromise, withAccessToken } from "@raycast/utils";

const github = OAuthService.github({
  scope: "repo read:org",
  personalAccessToken: getPreferenceValues<Preferences.Canaries>().personalAccessToken || undefined,
});

const PR_PAGE_SIZE = 50;
const MAX_PR_PAGES = 6;
const COMMENT_PAGE_SIZE = 100;
const MAX_COMMENT_PAGES = 5;
const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const LABELLED_URL = /canary[^:\n]*:\s*(https?:\/\/[^\s)>\]]+)/i;

interface Matchers {
  urlPrefix: string;
  extraUrlPrefix: string;
  commentAuthor: string;
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
  author: { login: string; __typename: string } | null;
  authorAssociation: string;
  body: string;
}

interface GqlComments {
  pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
  nodes: GqlComment[];
}

interface GqlPr {
  id: string;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  headRefName: string;
  updatedAt: string;
  comments: GqlComments;
}

const COMMENT_FIELDS = `
fragment CommentFields on IssueComment { author { login __typename } authorAssociation body }`;

const PRS_QUERY = `
query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: ${PR_PAGE_SIZE}, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        id number title url isDraft headRefName updatedAt
        comments(last: ${COMMENT_PAGE_SIZE}) {
          pageInfo { hasPreviousPage startCursor }
          nodes { ...CommentFields }
        }
      }
    }
  }
}${COMMENT_FIELDS}`;

const OLDER_COMMENTS_QUERY = `
query($id: ID!, $before: String) {
  node(id: $id) {
    ... on PullRequest {
      comments(last: ${COMMENT_PAGE_SIZE}, before: $before) {
        pageInfo { hasPreviousPage startCursor }
        nodes { ...CommentFields }
      }
    }
  }
}${COMMENT_FIELDS}`;

export default withAccessToken(github)(Command);

function Command() {
  const { repo, urlPrefix = "", extraUrlPrefix = "", commentAuthor = "" } = getPreferenceValues<Preferences.Canaries>();
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchPrs, [
    repo,
    { urlPrefix, extraUrlPrefix, commentAuthor },
  ]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter my PRs…">
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Couldn't load pull requests" description={error.message} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isLoading ? "Loading pull requests…" : "No open pull requests"}
          description={isLoading ? undefined : `No open PRs authored by you in ${repo}`}
        />
      )}
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
              {pr.extraUrl && (
                <Action.OpenInBrowser
                  title="Open Extra Link"
                  icon={Icon.Link}
                  url={pr.extraUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              )}
              {pr.canaryUrl && (
                <Action.CopyToClipboard
                  title="Copy Canary URL"
                  icon={Icon.Clipboard}
                  content={pr.canaryUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
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
  const viewer = await checkRepositoryAccess(repo);
  const q = `is:pr is:open author:${viewer} repo:${repo} sort:updated-desc`;
  const isTrusted = trustedBy(matchers.commentAuthor);

  const prs: GqlPr[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PR_PAGES; page++) {
    const { search }: { search: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: GqlPr[] } } =
      await graphql(PRS_QUERY, { q, after });
    prs.push(...search.nodes.filter((n) => n?.number));
    if (!search.pageInfo.hasNextPage) break;
    after = search.pageInfo.endCursor;
  }

  return Promise.all(prs.map((pr) => toPullRequest(pr, matchers, isTrusted)));
}

// Handles GraphQL errors itself so a hidden repository (SAML enforcement, missing OAuth approval) gets an actionable message.
async function checkRepositoryAccess(repo: string): Promise<string> {
  const [owner, name] = repo.split("/");
  const { data, errors } = await graphqlRaw<{
    viewer: { login: string };
    repository: { nameWithOwner: string } | null;
  }>(
    "query($owner: String!, $name: String!) { viewer { login } repository(owner: $owner, name: $name) { nameWithOwner } }",
    { owner, name },
  );
  if (!data.repository) {
    const tokenType = getAccessToken().type === "personal" ? "personal access token" : "OAuth";
    throw new Error(
      `Signed in as ${data.viewer.login} (${tokenType}), but ${repo} is not visible. Check the repository name, and that the organization approved Raycast's GitHub OAuth app (or set a Personal Access Token in preferences).${errors.length ? ` GitHub said: ${errors.join("; ")}` : ""}`,
    );
  }
  return data.viewer.login;
}

async function graphqlRaw<T>(
  query: string,
  variables: Record<string, string | null> = {},
): Promise<{ data: T; errors: string[] }> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken().token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  const errors = json.errors?.map((e) => e.message) ?? [];
  if (!json.data) throw new Error(errors.join("; ") || "GitHub API returned no data");
  return { data: json.data, errors };
}

async function graphql<T>(query: string, variables: Record<string, string | null> = {}): Promise<T> {
  const { data, errors } = await graphqlRaw<T>(query, variables);
  if (errors.length) throw new Error(errors.join("; "));
  return data;
}

async function toPullRequest(
  pr: GqlPr,
  matchers: Matchers,
  isTrusted: (comment: GqlComment) => boolean,
): Promise<PullRequest> {
  let canaryUrl: string | undefined;
  let extraUrl: string | undefined;
  let comments = pr.comments;

  // Newest comment wins (a redeploy posts a fresh URL); older pages are only fetched while no canary was found.
  for (let page = 0; ; page++) {
    const newestFirst = comments.nodes.filter(isTrusted).reverse();
    canaryUrl = findUrl(newestFirst, matchers.urlPrefix, LABELLED_URL);
    if (!extraUrl && matchers.extraUrlPrefix) extraUrl = findUrl(newestFirst, matchers.extraUrlPrefix);
    if (canaryUrl || !comments.pageInfo.hasPreviousPage || page + 1 >= MAX_COMMENT_PAGES) break;

    const older: { node: { comments: GqlComments } | null } = await graphql(OLDER_COMMENTS_QUERY, {
      id: pr.id,
      before: comments.pageInfo.startCursor,
    });
    if (!older.node) break;
    comments = older.node.comments;
  }

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    isDraft: pr.isDraft,
    headRefName: pr.headRefName,
    updatedAt: pr.updatedAt,
    canaryUrl,
    extraUrl,
  };
}

// Anyone can comment on a public PR, so only comments from the configured CI account (or, when unset, bot accounts and
// repository maintainers) may supply a URL that Enter opens.
function trustedBy(commentAuthor: string): (comment: GqlComment) => boolean {
  const login = normalizeLogin(commentAuthor);
  return (comment) =>
    login
      ? normalizeLogin(comment.author?.login ?? "") === login
      : comment.author?.__typename === "Bot" || TRUSTED_ASSOCIATIONS.has(comment.authorAssociation);
}

function normalizeLogin(login: string): string {
  return login
    .trim()
    .toLowerCase()
    .replace(/\[bot\]$/, "");
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
