import { logger } from "@chrismessina/raycast-logger";
import { operationNameOf } from "./queries-util";
import { getStoredAccessToken, signOut } from "./oauth";

const GRAPHQL_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

const apiLog = logger.child("[ProductHuntAPI]");

export type ApiErrorCategory = "notSignedIn" | "authRejected" | "rateLimited" | "graphql" | "network" | "unknown";

export class ApiError extends Error {
  category: ApiErrorCategory;
  constructor(category: ApiErrorCategory, message: string) {
    super(message);
    this.name = "ApiError";
    this.category = category;
  }
}

async function postGraphql(query: string, variables: Record<string, unknown>, token: string): Promise<Response> {
  return fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
}

export async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const done = apiLog.time("GraphQL request");
  apiLog.debug("request", { operation: operationNameOf(query), variables });

  // A stored OAuth token (from "Sign in with Product Hunt") authorizes every query.
  // PH tokens are long-lived; forceRefresh only bypasses the response cache upstream.
  const token = await getStoredAccessToken();
  if (!token) {
    throw new ApiError("notSignedIn", "Not signed in to Product Hunt.");
  }
  let res: Response;
  try {
    res = await postGraphql(query, variables, token);
  } catch (error) {
    apiLog.error("GraphQL network error", error);
    throw new ApiError("network", error instanceof Error ? error.message : "Network error.");
  }

  // A 401/403 means the stored token was rejected (revoked/invalidated server-side).
  // There is no refresh for PH tokens, so CLEAR the bad token (making the session
  // signed-out and recoverable) and surface an authRejected error the UI can act on.
  if (res.status === 401 || res.status === 403) {
    apiLog.debug("auth rejected by API; clearing the stored token");
    await signOut();
    throw new ApiError("authRejected", "Product Hunt rejected your sign-in. Please sign in again.");
  }

  done({
    status: res.status,
    rateLimitRemaining: res.headers.get("X-Rate-Limit-Remaining"),
    rateLimitReset: res.headers.get("X-Rate-Limit-Reset"),
  });

  if (res.status === 429) {
    const reset = res.headers.get("X-Rate-Limit-Reset");
    throw new ApiError("rateLimited", `Rate limited.${reset ? ` Resets in ${reset}s.` : ""}`);
  }
  if (!res.ok) {
    throw new ApiError("network", `GraphQL request failed with status ${res.status}.`);
  }

  let json: { data?: T; errors?: Array<{ message: string }> };
  try {
    json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  } catch {
    throw new ApiError("network", `GraphQL response body was not valid JSON (status ${res.status}).`);
  }
  if (json.errors && json.errors.length > 0) {
    throw new ApiError("graphql", json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new ApiError("graphql", "GraphQL response contained no data.");
  }
  apiLog.debug("GraphQL response ok", { operation: operationNameOf(query) });
  return json.data;
}
