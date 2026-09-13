import { AppError } from "../core/errors";
import { Catalog, Snapshot } from "../core/models";
import { ParseError, parseCatalog, parseSnapshot } from "../core/parser";
import { CATALOG_QUERY_DOCUMENT, Queries, QUERY_DOCUMENT } from "../core/query";

const ENDPOINT = "https://api.github.com/graphql";

/** GitHub's search ceiling. No pagination; hitting it becomes a menu warning. */
const PAGE_SIZE = 100;

/** The default is too long: a stuck connection would occupy the whole refresh. */
const TIMEOUT_MS = 15_000;

export async function fetchSnapshot(token: string, queries: Queries): Promise<Snapshot> {
  const payload = await post(token, QUERY_DOCUMENT, {
    prs: queries.prs,
    issues: queries.issues,
    review: queries.review,
    changesRequested: queries.changesRequested,
    myPullRequests: queries.myPullRequests,
    first: PAGE_SIZE,
  });
  return decode(payload, parseSnapshot);
}

/** Live organization/repository lists for the "Configure Scope" command. */
export async function fetchCatalog(token: string): Promise<Catalog> {
  return decode(await post(token, CATALOG_QUERY_DOCUMENT), parseCatalog);
}

/**
 * Turns a `ParseError` into a user-facing `AppError`. A GraphQL error carries
 * GitHub's own message; a malformed response cannot.
 */
function decode<T>(payload: unknown, parse: (value: unknown) => T): T {
  try {
    return parse(payload);
  } catch (error) {
    if (error instanceof ParseError) {
      throw new AppError(
        error.kind === "graphQL" ? { type: "graphQL", message: error.detail } : { type: "parse", detail: error.detail },
      );
    }
    throw error;
  }
}

async function post(token: string, query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const body = JSON.stringify(variables === undefined ? { query } : { query, variables });

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "GHBar-Raycast",
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError({ type: "network", detail: error instanceof Error ? error.message : String(error) });
  }

  validateStatus(response);

  try {
    return await response.json();
  } catch (error) {
    throw new AppError({ type: "parse", detail: error instanceof Error ? error.message : String(error) });
  }
}

function validateStatus(response: Response): void {
  if (response.status === 200) return;

  if (response.status === 401) {
    throw new AppError({ type: "notAuthenticated" });
  }

  if (response.status === 403 || response.status === 429) {
    // The real reset time comes in the headers; an hour out is a fine guess.
    const header = response.headers.get("x-ratelimit-reset");
    const seconds = header === null ? null : Number.parseInt(header, 10);
    const resetAt =
      seconds !== null && Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date(Date.now() + 60 * 60 * 1000);
    throw new AppError({ type: "rateLimited", resetAt: resetAt.toISOString() });
  }

  throw new AppError({ type: "network", detail: `HTTP ${response.status}` });
}
