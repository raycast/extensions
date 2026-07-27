/**
 * A minimal GitHub GraphQL client: bearer token from the gh CLI, bounded
 * concurrency, and retries on 5xx / secondary-rate-limit responses. Ported
 * from flex-review's internal/gh client.
 */
import { GhError, forgetToken, loginCommand, token } from "./gh-cli";
import { host } from "./preferences";

const DEFAULT_ENDPOINT = "https://api.github.com/graphql";

/**
 * Bounds simultaneous in-flight calls so a burst of category refreshes can't
 * trip GitHub's secondary rate limits.
 */
const MAX_CONCURRENT = 6;
const MAX_ATTEMPTS = 3;
const MAX_WAIT_MS = 60_000;

export class GraphQLError extends Error {
  /** The `X-GitHub-SSO` header, when GitHub returned one. Carries an authorize URL. */
  readonly ssoHeader?: string;

  constructor(message: string, ssoHeader?: string | null) {
    super(message);
    this.name = "GraphQLError";
    this.ssoHeader = ssoHeader ?? undefined;
  }
}

/**
 * The most recent SAML refusal, if any. A search across several orgs comes
 * back as *partial* data plus an error for the protected org, so the request
 * itself succeeds and there's nowhere to throw — the views read this instead
 * and show a banner alongside the results they did get.
 */
let lastSamlRefusal: { message: string; ssoHeader?: string; at: number } | undefined;

/** Reports the most recent SAML refusal, or undefined if there hasn't been one. */
export function takeSamlRefusal(): { message: string; ssoHeader?: string } | undefined {
  if (!lastSamlRefusal) return undefined;
  // Stale refusals shouldn't haunt a later, healthy refresh.
  if (Date.now() - lastSamlRefusal.at > 60_000) {
    lastSamlRefusal = undefined;
    return undefined;
  }
  return { message: lastSamlRefusal.message, ssoHeader: lastSamlRefusal.ssoHeader };
}

export function clearSamlRefusal(): void {
  lastSamlRefusal = undefined;
}

/** Reports whether any of the GraphQL errors is a SAML authorization refusal. */
function isSamlRefusal(messages: string[], ssoHeader: string | null): boolean {
  if (ssoHeader) return true;
  return messages.some((m) => {
    const t = m.toLowerCase();
    return t.includes("saml") || t.includes("single sign-on") || t.includes("grant your oauth token access");
  });
}

function endpoint(): string {
  const h = host();
  return h ? `https://${h}/api/graphql` : DEFAULT_ENDPOINT;
}

let inFlight = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return;
  }
  // Woken by release(), which hands its slot over directly — inFlight already
  // accounts for it, so don't increment again here.
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) {
    next();
    return;
  }
  inFlight--;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Computes how long to wait before the next retry, honoring GitHub's
 * Retry-After / X-RateLimit-Reset headers when present, else exponential.
 */
function backoff(response: Response | undefined, attempt: number): number {
  if (response) {
    const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(retryAfter * 1000, MAX_WAIT_MS);
    }
    if (response.status === 403 || response.status === 429) {
      const reset = Number.parseInt(response.headers.get("x-ratelimit-reset") ?? "", 10);
      if (Number.isFinite(reset)) {
        const delta = reset * 1000 - Date.now();
        if (delta > 0) return Math.min(delta, MAX_WAIT_MS);
      }
    }
  }
  // Exponential fallback: ~0.5s, 1s, 2s…
  return Math.min(500 * 2 ** (attempt - 1), MAX_WAIT_MS);
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; type?: string }[];
};

/** Executes a GraphQL query and returns its `data` payload. */
export async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const bearer = await token(host());
  const body = JSON.stringify({ query, variables });

  await acquire();
  try {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(endpoint(), {
          method: "POST",
          headers: {
            Authorization: `bearer ${bearer}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "gh-review-raycast",
          },
          body,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await sleep(backoff(undefined, attempt));
        continue;
      }

      const text = await response.text();
      const secondary = response.status === 403 && text.toLowerCase().includes("secondary rate limit");

      if (response.status >= 500 || response.status === 429 || secondary) {
        lastError = new GraphQLError(`GitHub returned ${response.status}: ${text.trim().slice(0, 200)}`);
        await sleep(backoff(response, attempt));
        continue;
      }
      if (response.status === 401) {
        // The cached token is stale or was revoked — drop it so the next
        // attempt re-reads from gh.
        forgetToken();
        throw new GhError(
          "GitHub rejected the token from gh (invalid or expired)",
          `Run \`${loginCommand(host())}\` to re-authenticate.`,
        );
      }
      const ssoHeader = response.headers.get("x-github-sso");

      if (!response.ok) {
        throw new GraphQLError(`GitHub returned ${response.status}: ${text.trim().slice(0, 200)}`, ssoHeader);
      }

      const parsed = JSON.parse(text) as GraphQLResponse<T>;
      if (parsed.errors?.length) {
        const messages = parsed.errors.map((e) => e.message);
        const joined = messages.join("; ");

        if (isSamlRefusal(messages, ssoHeader)) {
          lastSamlRefusal = { message: joined, ssoHeader: ssoHeader ?? undefined, at: Date.now() };
          // A multi-org search returns results for the orgs we *can* see plus
          // an error for the protected one. Throwing would discard perfectly
          // good data and show nothing; better to hand back what GitHub gave
          // us and let the view flag the gap.
          if (parsed.data) return parsed.data;
        }
        throw new GraphQLError(joined, ssoHeader);
      }
      return parsed.data as T;
    }

    throw lastError ?? new GraphQLError("GitHub request failed");
  } finally {
    release();
  }
}
