import { getPreferenceValues } from "@raycast/api";
import { GitHubPR } from "../types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Local copy of the array guard (mirrors `asArray` in ./index).
 *
 * Kept local ON PURPOSE: index.ts imports this module for the menu-bar scan, so importing
 * back from ./index would create a cycle and leave one module partially initialised at
 * eval time. Four lines of duplication is the cheaper trade. If this file grows, move
 * both copies to a dependency-free primitives module rather than adding the import back.
 */
function asArray<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? (payload as T[]) : [];
}

/**
 * Experimental GraphQL transport for the merged-PR list.
 *
 * Why it is opt-in and NOT the default:
 * - GitHub's GraphQL endpoint has **no unauthenticated tier**. This extension is
 *   zero-setup by design and must stay fully functional with no token, so REST
 *   remains the supported path and GraphQL is an accelerator for token holders.
 * - The REST path already costs 1 request per open (slugs resolve from the list
 *   response — see parseExtensionSlugFromPR), so this is not a request-count win.
 *
 * What it does buy, measured against the live API (2026-07-28):
 * - `states: MERGED` filters server-side, so all 50 returned PRs are usable. REST
 *   returns closed-or-merged and ~15 of 50 are discarded client-side.
 * - Cost 1 point of the 5,000/hr GraphQL budget for the same 50 PRs.
 *
 * Returns null when GraphQL is unavailable or fails for ANY reason; every caller
 * must fall back to REST rather than surfacing an error.
 */
const PR_QUERY = `
query StoreUpdatePRs($first: Int!) {
  repository(owner: "raycast", name: "extensions") {
    pullRequests(states: MERGED, first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number
        title
        url
        mergedAt
        headRefName
        author { login url avatarUrl }
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`;

interface GraphQLPRNode {
  number: number;
  title: string;
  url: string;
  mergedAt: string | null;
  headRefName: string | null;
  author: { login: string; url: string; avatarUrl: string } | null;
  labels: { nodes: { name: string }[] | null } | null;
}

/** True only when the user opted in AND supplied a token (GraphQL requires one). */
export function isGraphQLEnabled(): boolean {
  try {
    const { useGraphQL, githubToken } = getPreferenceValues<Preferences>();
    return Boolean(useGraphQL && githubToken?.trim());
  } catch {
    return false;
  }
}

/**
 * Maps a GraphQL node onto the REST-shaped `GitHubPR` the rest of the code consumes.
 * Keeping one internal shape means the transport is swappable without touching any
 * downstream logic (slug resolution, dedup, removal detection).
 *
 * `author` is nullable in GraphQL (deleted accounts), so it degrades to a display-safe
 * placeholder rather than throwing on a property read.
 */
function toGitHubPR(node: GraphQLPRNode): GitHubPR {
  return {
    number: node.number,
    title: node.title ?? "",
    html_url: node.url,
    merged_at: node.mergedAt,
    user: {
      login: node.author?.login ?? "ghost",
      html_url: node.author?.url ?? "",
      avatar_url: node.author?.avatarUrl ?? "",
    },
    labels: asArray<{ name: string }>(node.labels?.nodes).filter((l) => typeof l?.name === "string"),
    head: { ref: node.headRefName ?? undefined },
  };
}

/**
 * Fetches merged PRs via GraphQL. Returns null on ANY failure so the caller falls
 * back to REST — a partial or malformed response must never surface as an error to
 * the user when a working transport is available.
 */
export async function fetchMergedPRsViaGraphQL(first = 50): Promise<GitHubPR[] | null> {
  let token: string | undefined;
  try {
    token = getPreferenceValues<Preferences>().githubToken?.trim();
  } catch {
    return null;
  }
  if (!token) return null;

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: PR_QUERY, variables: { first } }),
    });
    if (!response.ok) return null;

    // GraphQL answers 200 even for errors, and can return partial data alongside an
    // `errors` array. Treat any errors array as a failure and fall back to REST
    // rather than caching a partial result as truth.
    const payload = (await response.json()) as {
      data?: { repository?: { pullRequests?: { nodes?: unknown } } };
      errors?: unknown[];
    };
    if (asArray(payload.errors).length > 0) return null;

    const nodes = asArray<GraphQLPRNode>(payload.data?.repository?.pullRequests?.nodes);
    if (nodes.length === 0) return null;

    return nodes.filter((n) => n && n.mergedAt).map(toGitHubPR);
  } catch {
    return null;
  }
}
