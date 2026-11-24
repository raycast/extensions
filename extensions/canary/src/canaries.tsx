import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { getAccessToken, OAuthService, useCachedPromise, withAccessToken } from "@raycast/utils";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { useMemo } from "react";

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
  headRefOid: string;
  canaryUrl?: string;
  extraUrl?: string;
}

interface CanaryTarget {
  number: number;
  canaryUrl: string;
  headRefOid: string;
}

// What the canary reports about the commit it runs, compared with the PR's latest commit.
type CanaryCommit = { head: string } & ({ version: string; isLatest: boolean } | { error: string; status?: number });

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
  ]);

  // Checked after the list is shown, so a slow or sleeping canary doesn't hold back the pull requests.
  const targets = useMemo(
    () =>
      (data ?? []).flatMap((pr) =>
        pr.canaryUrl ? [{ number: pr.number, canaryUrl: pr.canaryUrl, headRefOid: pr.headRefOid }] : [],
      ),
    [data],
  );
  const commitPath = checkCanaryCommit ? versionPath.trim() || DEFAULT_VERSION_PATH : "";
  const {
    data: commits,
    isLoading: commitsLoading,
    revalidate: revalidateCommits,
  } = useCachedPromise(fetchCanaryCommits, [targets, commitPath], {
    execute: Boolean(commitPath) && targets.length > 0,
    keepPreviousData: true,
  });
  const refresh = () => {
    revalidate();
    if (commitPath) revalidateCommits();
  };

  return (
    <List isLoading={isLoading || commitsLoading} searchBarPlaceholder="Filter my PRs…">
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
          subtitle={pr.headRefOid.slice(0, 7)}
          keywords={[pr.headRefName, String(pr.number), `#${pr.number}`]}
          icon={pr.isDraft ? { source: Icon.Circle, tintColor: Color.SecondaryText } : Icon.CircleProgress100}
          accessories={[
            canaryAccessory(pr, commitPath ? commits?.[pr.number] : undefined),
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
                onAction={refresh}
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

async function fetchCanaryCommits(targets: CanaryTarget[], versionPath: string): Promise<Record<number, CanaryCommit>> {
  const results = await Promise.all(
    targets.map(async (t) => [t.number, await fetchCanaryCommit(t.canaryUrl, versionPath, t.headRefOid)] as const),
  );
  return Object.fromEntries(results);
}

// Asks the canary itself which commit it runs, e.g. /build-info.json → {"version":"d2e2463"}.
async function fetchCanaryCommit(canaryUrl: string, versionPath: string, headRefOid: string): Promise<CanaryCommit> {
  const head = headRefOid.slice(0, 7);
  try {
    const canary = new URL(canaryUrl);
    const url = new URL(versionPath, canary.origin);
    if (url.origin !== canary.origin || !/^https?:$/.test(url.protocol)) {
      return { head, error: "Canary Version Path must be a path on the canary's own host" };
    }
    // The link comes from a PR comment, so never let it point these automatic requests at this computer or its network.
    if (await isPrivateHost(url.hostname)) {
      return { head, error: `Not checked: ${url.hostname} is a local or private-network address` };
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(VERSION_TIMEOUT_MS) });
    if (!response.ok) return { head, error: `${url} responded ${response.status}`, status: response.status };
    const version = findCommit(await response.text());
    if (!version) return { head, error: `No commit found in ${url}` };
    return { head, version, isLatest: headRefOid.toLowerCase().startsWith(version.toLowerCase()) };
  } catch (e) {
    return { head, error: e instanceof Error ? e.message : String(e) };
  }
}

async function isPrivateHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  return addresses.some(isPrivateAddress);
}

function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (isIP(ip) === 6) {
    // IPv4-mapped addresses, e.g. ::ffff:127.0.0.1, which URL parsing turns into ::ffff:7f00:1.
    const mapped = ip.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
    if (mapped) {
      if (mapped[1]) return isPrivateAddress(mapped[1]);
      const hi = parseInt(mapped[2], 16);
      const lo = parseInt(mapped[3], 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return ip === "::" || ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
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

// Green when the canary runs the latest commit (or its commit is unknown), yellow when it runs an older one,
// red when the canary refuses the request (403).
function canaryAccessory({ canaryUrl, headRefOid }: PullRequest, commit?: CanaryCommit): List.Item.Accessory {
  if (!canaryUrl) return { tag: { value: "no canary", color: Color.SecondaryText } };
  // A result for an earlier commit of this PR is stale until the check reruns.
  if (!commit || commit.head !== headRefOid.slice(0, 7)) return { tag: { value: "canary", color: Color.Green } };
  if ("error" in commit) {
    return {
      tag: { value: "canary", color: commit.status === 403 ? Color.Red : Color.Green },
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
    headRefOid: pr.headRefOid,
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
