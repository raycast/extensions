// Codex GraphQL API client (https://docs.codex.io).
//
// Endpoint: POST https://graph.codex.io/graphql
// Auth header: `Authorization: <apiKey>` (the raw key, no "Bearer" prefix).

import { CodexError, type CodexErrorKind, type Network, type SearchOptions, type TokenResult } from "./types";
import { buildTokenUrls, definedUrlFor, toNetwork } from "./networks";

const CODEX_GRAPHQL_ENDPOINT = "https://graph.codex.io/graphql";
const DEFAULT_SEARCH_LIMIT = 25;

/** Backoff delays (ms) between rate-limit retries: first retry after 400ms, second after 1000ms. */
const RATE_LIMIT_RETRY_DELAYS_MS = [400, 1000];

/**
 * Codex API keys are 40 lowercase hex characters (checked against a real key,
 * 2026-09-23). Keep this strict: the setup screen sends clipboard text that
 * matches it to Codex, so a loose pattern would leak other secrets.
 */
export const CODEX_KEY_PATTERN = /^[0-9a-f]{40}$/;

export function looksLikeCodexKey(text: string): boolean {
  return CODEX_KEY_PATTERN.test(text.trim());
}

// ---------------------------------------------------------------------------
// GraphQL queries
// ---------------------------------------------------------------------------

const FILTER_TOKENS_QUERY = `
  query FilterTokens($phrase: String!, $limit: Int, $filters: TokenFilters) {
    filterTokens(
      phrase: $phrase
      filters: $filters
      rankings: [{ attribute: volume24, direction: DESC }]
      limit: $limit
    ) {
      results {
        priceUSD
        change24
        liquidity
        volume24
        marketCap
        token {
          address
          name
          symbol
          networkId
          info {
            imageThumbUrl
            imageSmallUrl
          }
        }
      }
    }
  }
`;

const GET_NETWORKS_QUERY = `
  query GetNetworks {
    getNetworks {
      id
      name
      networkShortName
    }
  }
`;

// ---------------------------------------------------------------------------
// Raw response shapes (only the fields we request)
// ---------------------------------------------------------------------------

interface FilterTokensToken {
  address: string;
  name?: string | null;
  symbol?: string | null;
  networkId: number;
  info?: {
    imageThumbUrl?: string | null;
    imageSmallUrl?: string | null;
  } | null;
}

interface FilterTokensResult {
  priceUSD?: string | null;
  change24?: string | null;
  liquidity?: string | null;
  volume24?: string | null;
  marketCap?: string | null;
  token: FilterTokensToken;
}

interface FilterTokensData {
  filterTokens: { results: FilterTokensResult[] } | null;
}

interface GetNetworksRow {
  id: number;
  name: string;
  networkShortName?: string | null;
}

interface GetNetworksData {
  getNetworks: GetNetworksRow[];
}

// ---------------------------------------------------------------------------
// Fetch + error classification
// ---------------------------------------------------------------------------

interface GraphQLErrorEntry {
  message?: string;
  extensions?: { code?: string };
}

interface GraphQLResponseBody<T> {
  data?: T;
  errors?: GraphQLErrorEntry[];
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function makeAbortError(): Error {
  // Mirrors the error fetch() throws when aborted (DOMException "AbortError").
  return new DOMException("The operation was aborted.", "AbortError");
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(makeAbortError());
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(makeAbortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Classify a Codex GraphQL HTTP response as a CodexError, or return
 * undefined when the response should be treated as success.
 */
export function classifyResponse(
  status: number,
  body: GraphQLResponseBody<unknown> | undefined,
): { kind: Exclude<CodexErrorKind, "network">; message: string } | undefined {
  const errors = body?.errors ?? [];
  const message = errors
    .map((e) => e.message)
    .filter((m): m is string => Boolean(m))
    .join("; ");
  const codes = errors.map((e) => e.extensions?.code).filter((c): c is string => Boolean(c));

  if (status === 401 || codes.includes("NOT_AUTHORIZED")) {
    return { kind: "invalid-key", message: message || "Your API key was not found" };
  }
  // Monthly quota exhaustion is distinct from the per-second rate limit;
  // Codex does not document a dedicated error code for it, so it is
  // recognized by message content instead.
  if (/quota|monthly/i.test(message)) {
    return { kind: "quota", message };
  }
  if (status === 429 || codes.includes("TOO_MANY_REQUESTS")) {
    return { kind: "rate-limit", message: message || "Rate limited by the Codex.io API" };
  }
  if (!(status >= 200 && status < 300) || errors.length > 0) {
    return { kind: "unknown", message: message || `Codex.io API error (HTTP ${status})` };
  }
  return undefined;
}

async function codexFetch<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    let response: Response;
    try {
      response = await fetch(CODEX_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
        signal,
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw new CodexError("network", err instanceof Error ? err.message : "Network request failed");
    }

    let body: GraphQLResponseBody<T> | undefined;
    try {
      body = (await response.json()) as GraphQLResponseBody<T>;
    } catch (err) {
      if (isAbortError(err)) throw err;
      body = undefined;
    }

    const classification = classifyResponse(response.status, body);
    if (classification === undefined) {
      if (!body || body.data === undefined) {
        throw new CodexError("unknown", `Codex.io API returned an unexpected response (HTTP ${response.status})`);
      }
      return body.data;
    }

    if (classification.kind === "rate-limit" && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
      await delay(RATE_LIMIT_RETRY_DELAYS_MS[attempt], signal);
      attempt += 1;
      continue;
    }

    throw new CodexError(classification.kind, classification.message);
  }
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function toNumber(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function mapFilterTokensResult(
  row: FilterTokensResult,
  networkById: Map<number, Network>,
): TokenResult | undefined {
  const token = row.token;
  if (!token?.address || typeof token.networkId !== "number") return undefined;

  const network = networkById.get(token.networkId);
  const networkName = network?.name ?? `Network ${token.networkId}`;
  // Prefer an already-resolved Network's slug/explorer template (built once
  // by getNetworks via toNetwork, using the real Codex networkShortName).
  // Only fall back to re-deriving from scratch, via the shared
  // buildTokenUrls helper, when the network wasn't found in the cache.
  const {
    slug: networkSlug,
    definedUrl,
    explorerUrl,
  } = network
    ? {
        slug: network.slug,
        definedUrl: definedUrlFor(network.slug, token.address),
        explorerUrl: network.explorerTokenUrl?.replace("{address}", token.address),
      }
    : buildTokenUrls({ networkId: token.networkId, networkName, address: token.address });

  return {
    id: `${token.address}:${token.networkId}`,
    address: token.address,
    networkId: token.networkId,
    networkName,
    networkSlug,
    name: token.name ?? "",
    symbol: token.symbol ?? "",
    imageUrl: token.info?.imageThumbUrl ?? token.info?.imageSmallUrl ?? undefined,
    priceUsd: toNumber(row.priceUSD),
    change24: toNumber(row.change24), // already a fraction: -0.0306 is -3.06% (checked against defined.fi),
    liquidityUsd: toNumber(row.liquidity),
    volume24Usd: toNumber(row.volume24),
    marketCapUsd: toNumber(row.marketCap),
    definedUrl,
    explorerUrl,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Network lists cached per API key for the process lifetime. */
const networksByKey = new Map<string, Promise<Network[]>>();

function fetchNetworks(apiKey: string, signal?: AbortSignal): Promise<Network[]> {
  return codexFetch<GetNetworksData>(apiKey, GET_NETWORKS_QUERY, {}, signal).then((data) =>
    [...data.getNetworks]
      .map((row) => toNetwork(row.id, row.name, row.networkShortName))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

/** Rejects with an AbortError when `signal` aborts; the shared promise keeps running. */
function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(makeAbortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(makeAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * Fetch and cache the Codex network list per API key, sorted by name. The
 * shared request never uses a caller's signal, so one aborted search cannot
 * fail the lookup for the next one.
 */
export function getNetworks(apiKey: string, signal?: AbortSignal): Promise<Network[]> {
  let promise = networksByKey.get(apiKey);
  if (!promise) {
    promise = fetchNetworks(apiKey).catch((err) => {
      // Don't cache a failed lookup; the next call should retry.
      networksByKey.delete(apiKey);
      throw err;
    });
    networksByKey.set(apiKey, promise);
  }
  return withAbort(promise, signal);
}

export async function searchTokens(apiKey: string, phrase: string, opts: SearchOptions = {}): Promise<TokenResult[]> {
  if (phrase.trim().length === 0) return [];

  const { networkId, limit = DEFAULT_SEARCH_LIMIT, signal } = opts;
  const variables: Record<string, unknown> = {
    phrase, // kept exactly as typed: a leading "$" forces exact symbol match
    limit,
  };
  if (networkId !== undefined) {
    variables.filters = { network: [networkId] };
  }

  const [data, networks] = await Promise.all([
    codexFetch<FilterTokensData>(apiKey, FILTER_TOKENS_QUERY, variables, signal),
    getNetworks(apiKey, signal),
  ]);

  const networkById = new Map(networks.map((n) => [n.id, n]));
  const rows = data.filterTokens?.results ?? [];

  const byId = new Map<string, TokenResult>();
  for (const row of rows) {
    const mapped = mapFilterTokensResult(row, networkById);
    if (mapped && !byId.has(mapped.id)) {
      byId.set(mapped.id, mapped);
    }
  }
  return [...byId.values()];
}

/** Resolves if the key works, throws CodexError otherwise. */
export async function validateKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  // Always hit the API: a cached list must not vouch for a different or revoked key.
  const networks = await fetchNetworks(apiKey, signal);
  networksByKey.set(apiKey, Promise.resolve(networks));
}
