import { Toast, showToast } from "@raycast/api";
import type { ReviewRequest } from "./types";

interface SearchResult {
  count: number;
  items: ReviewRequest[];
}

function buildQuery(excludeDrafts: boolean | undefined, extraQuery: string | undefined) {
  const parts = ["is:open", "is:pr", "review-requested:@me", "sort:updated-desc"];
  if (excludeDrafts) parts.push("draft:false");
  if (extraQuery?.trim()) parts.push(extraQuery.trim());
  return parts.join(" ");
}

// GraphQL query string
const GQL = `
  query ReviewRequests($q: String!, $first: Int!) {
    search(query: $q, type: ISSUE, first: $first) {
      issueCount
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          isDraft
          createdAt
          updatedAt
          author {
            login
          }
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

export async function fetchReviewRequests(params: {
  graphqlEndpoint: string;
  token: string;
  excludeDrafts?: boolean;
  extraQuery?: string;
  first: number;
}): Promise<SearchResult> {
  const { graphqlEndpoint, token, excludeDrafts, extraQuery, first } = params;

  const query = buildQuery(!!excludeDrafts, extraQuery);
  const body = JSON.stringify({
    query: GQL,
    variables: { q: query, first: Math.min(Math.max(first, 1), 100) },
  });

  const res = await fetch(graphqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API: ${res.status} ${res.statusText} – ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: {
      search: {
        issueCount: number;
        nodes: Array;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Empty response from GitHub");
  }

  const { issueCount, nodes } = json.data.search;
  const items: ReviewRequest[] = (nodes || [])
    .filter((n) => n && "number" in n && "repository" in n)
    .map((n) => ({
      id: n.id,
      number: n.number,
      title: n.title?.replace(/\s+/g, " ").trim() ?? "(no title)",
      url: n.url,
      isDraft: !!n.isDraft,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      authorLogin: n.author?.login ?? "unknown",
      repo: n.repository?.nameWithOwner ?? "unknown/unknown",
    }));

  return { count: issueCount || items.length, items };
}

export function webSearchURL(
  graphqlEndpoint: string,
  excludeDrafts: boolean | undefined,
  extraQuery: string | undefined,
) {
  // Convert GraphQL endpoint to web host root
  // Examples:
  // - https://api.github.com/graphql -> https://github.com
  // - https://github.myco.com/api/graphql -> https://github.myco.com
  const url = new URL(graphqlEndpoint);
  // api.github.com -> github.com
  const host = url.hostname === "api.github.com" ? "github.com" : url.hostname;
  const origin = `${url.protocol}//${host}`;

  const q = encodeURIComponent(buildQuery(!!excludeDrafts, extraQuery));
  return `${origin}/pulls?q=${q}`;
}

export async function notifyError(message: string) {
  await showToast({ style: Toast.Style.Failure, title: "GitHub Review Requests", message });
}
