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
const VERSION_TIMEOUT_MS = 10_000;
const DEFAULT_VERSION_PATH = "/build-info.json";
const COMMIT = /^[0-9a-f]{7,40}$/i;
const COMMIT_KEYS = ["commit", "sha", "gitCommit", "revision", "version"];

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
  headCommit: string;
  canaryUrl?: string;
  extraUrl?: string;
  canaryCommit?: CanaryCommit;
}

// What the canary reports about the commit it runs, compared with the PR's latest commit.
type CanaryCommit = { head: string } & ({ version: string; isLatest: boolean } | { error: string });

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
  headRefOid: string;
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
        id number title url isDraft headRefName updatedAt headRefOid
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
  const {
    repo,
    urlPrefix = "",
    extraUrlPrefix = "",
    commentAuthor = "",
    checkCanaryCommit = true,
    versionPath = "",
  } = getPreferenceValues<Preferences.Canaries>();
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchPrs, [
    repo,
    { urlPrefix, extraUrlPrefix, commentAuthor },
    checkCanaryCommit ? versionPath.trim() || DEFAULT_VERSION_PATH : null,
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
          subtitle={pr.headCommit}
          keywords={[pr.headRefName, String(pr.number), `#${pr.number}`]}
          icon={pr.isDraft ? { source: Icon.Circle, tintColor: Color.SecondaryText } : Icon.CircleProgress100}
          accessories={[canaryAccessory(pr), { date: new Date(pr.updatedAt) }]}
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

async function fetchPrs(repo: string, matchers: Matchers, versionPath: string | null): Promise<PullRequest[]> {
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

  const pullRequests = await Promise.all(prs.map((pr) => toPullRequest(pr, matchers, isTrusted)));
  if (!versionPath) return pullRequests;
  return Promise.all(
    pullRequests.map(async (pr, i) =>
      pr.canaryUrl
        ? { ...pr, canaryCommit: await fetchCanaryCommit(pr.canaryUrl, versionPath, prs[i].headRefOid) }
        : pr,
    ),
  );
}

// Asks the canary itself which commit it runs, e.g. /build-info.json → {"version":"d2e2463"}.
async function fetchCanaryCommit(canaryUrl: string, versionPath: string, headRefOid: string): Promise<CanaryCommit> {
  const head = headRefOid.slice(0, 7);
  try {
    const url = new URL(versionPath, new URL(canaryUrl).origin);
    const response = await fetch(url, { signal: AbortSignal.timeout(VERSION_TIMEOUT_MS) });
    if (!response.ok) return { head, error: `${url} responded ${response.status}` };
    const version = findCommit(await response.text());
    if (!version) return { head, error: `No commit found in ${url}` };
    return { head, version, isLatest: headRefOid.toLowerCase().startsWith(version.toLowerCase()) };
  } catch (e) {
    return { head, error: e instanceof Error ? e.message : String(e) };
  }
}

// Accepts a JSON object with the commit under a common key, or a plain-text file that holds only the commit.
function findCommit(body: string): string | undefined {
  const text = body.trim();
  if (COMMIT.test(text)) return text;
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return COMMIT_KEYS.map((key) => json?.[key])
      .find((v): v is string => typeof v === "string" && COMMIT.test(v.trim()))
      ?.trim();
  } catch {
    return undefined;
  }
}

// Green when the canary runs the latest commit (or its commit is unknown), yellow when it runs an older one.
function canaryAccessory({ canaryUrl, canaryCommit: commit }: PullRequest): List.Item.Accessory {
  if (!canaryUrl) return { tag: { value: "no canary", color: Color.SecondaryText } };
  if (!commit) return { tag: { value: "canary", color: Color.Green } };
  if ("error" in commit) {
    return {
      tag: { value: "canary", color: Color.Green },
      tooltip: `Couldn't read the canary's commit: ${commit.error}`,
    };
  }
  return commit.isLatest
    ? { tag: { value: "canary", color: Color.Green }, tooltip: `Canary runs ${commit.version}, the latest commit` }
    : {
        tag: { value: "canary", color: Color.Yellow },
        tooltip: `Canary runs ${commit.version}, but the latest commit is ${commit.head}`,
      };
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
  // GitHub repeats the same error once per affected node, e.g. per pull request.
  const errors = [...new Set(json.errors?.map((e) => e.message))];
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
    headCommit: pr.headRefOid.slice(0, 7),
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
