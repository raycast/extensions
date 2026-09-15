/**
 * A minimal GitHub GraphQL client: bearer token from the gh CLI, bounded
 * concurrency, and retries on 5xx / secondary-rate-limit responses. Ported
 * from flex-review's internal/gh client.
 *
 * Retrying is only safe when resending the operation can't change the outcome.
 * Callers that create something — a comment, a thread reply — opt out with
 * `idempotent: false` so an ambiguous failure surfaces instead of duplicating
 * the write. See `UnconfirmedWriteError`.
 */
import { GhError, forgetToken, loginCommand, token } from "./gh-cli";
import { host, usesCli } from "./preferences";

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
 * A write that failed without GitHub saying whether it landed — a dropped
 * connection, a 5xx returned after the mutation may already have been applied,
 * a reply whose body was interrupted or unreadable, a response that left the
 * created object out, or an error GitHub raised somewhere mid-mutation.
 * Sending it again could post a duplicate, so the client stops and hands the
 * decision to the person, who can check the pull request first.
 */
export class UnconfirmedWriteError extends Error {
  constructor(reason: string) {
    super(
      `GitHub did not confirm the request (${reason}). It may already have gone through — check the pull request on GitHub before sending it again.`,
    );
    this.name = "UnconfirmedWriteError";
  }
}

export type RequestOptions = {
  /**
   * Whether resending the operation is harmless. Queries and mutations that
   * converge on one state (resolving a thread) retry freely; a mutation that
   * creates something new must not, so it passes `false`.
   *
   * Defaults to `true`, which keeps every existing read on the retry loop.
   */
  idempotent?: boolean;
  /**
   * Reads a non-idempotent response and reports whether it carries the thing
   * the mutation was asked to create. GitHub can answer a mutation with a
   * partial result — the new comment alongside an error on some other part of
   * the selection — and it can answer with the field missing or null. The
   * first is a write that plainly landed; the second says nothing either way.
   * Without this the client can only go by whether `data` is present at all.
   */
  confirmsWrite?: (data: unknown) => boolean;
};

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
  return messages.some(m => {
    const t = m.toLowerCase();
    return t.includes("saml") || t.includes("single sign-on") || t.includes("grant your oauth token access");
  });
}

/**
 * The `type` values GitHub attaches to errors it raises while validating an
 * operation — a node it can't resolve, a permission it won't grant, a body it
 * won't accept. It answers those without touching any data, so a write that
 * comes back carrying only these definitely did not land.
 *
 * Everything else is left open on purpose. GitHub's mid-flight failures, most
 * visibly the untyped "Something went wrong while executing your query", can
 * arrive after the mutation has been applied.
 */
const REJECTED_BEFORE_WRITE = new Set([
  "NOT_FOUND",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "ACTOR_NOT_FOUND",
  "INVALID",
  "UNPROCESSABLE",
  "TYPE_NOT_FOUND",
  "MAX_NODE_LIMIT_EXCEEDED",
  "RATE_LIMITED",
]);

/**
 * Reports whether GitHub turned the whole operation away before running it.
 *
 * The type alone isn't enough: the same `NOT_FOUND` that rejects a node id in
 * the input can also be raised further down the selection, after the mutation
 * has been applied. An error GitHub raised while validating carries no path,
 * or at most the mutation field itself; anything deeper means execution had
 * already begun, and the write stays unconfirmed.
 */
function rejectedBeforeWrite(errors: unknown[]): boolean {
  // An entry that can't be read establishes nothing, and neither does an empty
  // list that claimed to hold errors: both leave the write unconfirmed.
  if (errors.length === 0) return false;
  return errors.every(error => {
    if (!isEnvelope(error)) return false;
    const { type, path } = error as GraphQLErrorEntry;
    if (typeof type !== "string" || !REJECTED_BEFORE_WRITE.has(type)) return false;
    return !Array.isArray(path) || path.length <= 1;
  });
}

/** Reports whether a parsed body is shaped like a GraphQL result at all. */
function isEnvelope(value: unknown): value is GraphQLResponse<unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The message out of one error entry. GitHub always sends a string, but a
 * malformed or truncated list can hold anything — including `null`, which
 * reading `.message` off would turn into a failure of its own.
 */
function errorMessage(error: unknown): string {
  if (isEnvelope(error)) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return "unspecified error";
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
  await new Promise<void>(resolve => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) {
    next();
    return;
  }
  inFlight--;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

type GraphQLErrorEntry = { message: string; type?: string; path?: (string | number)[] };

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorEntry[];
};

/** Executes a GraphQL query and returns its `data` payload. */
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: RequestOptions = {},
): Promise<T> {
  const idempotent = options.idempotent ?? true;
  // Callers that don't describe their result fall back to the old bar: any
  // `data` at all counts as confirmation.
  const confirmsWrite = options.confirmsWrite ?? ((data: unknown) => data !== undefined && data !== null);
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
        // The request may have reached GitHub with only the reply lost on the
        // way back, so a write stops here rather than risk posting twice.
        if (!idempotent) throw new UnconfirmedWriteError(lastError.message);
        await sleep(backoff(undefined, attempt));
        continue;
      }

      let text: string;
      try {
        text = await response.text();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        // The headers arrived, so GitHub ran the operation; only the body was
        // lost on the way back. A write has no idea whether it landed.
        if (!idempotent) throw new UnconfirmedWriteError(`its response was interrupted: ${reason}`);
        throw new GraphQLError(`Could not read GitHub's response: ${reason}`);
      }
      const secondary = response.status === 403 && text.toLowerCase().includes("secondary rate limit");

      if (response.status >= 500 || response.status === 429 || secondary) {
        lastError = new GraphQLError(`GitHub returned ${response.status}: ${text.trim().slice(0, 200)}`);
        // Rate-limit answers are refusals — GitHub turned the request away
        // without running it, so even a write is safe to send again. A 5xx
        // says nothing either way: the mutation may already have been applied.
        if (!idempotent && response.status >= 500) {
          throw new UnconfirmedWriteError(`GitHub returned ${response.status}`);
        }
        await sleep(backoff(response, attempt));
        continue;
      }
      if (response.status === 401) {
        // The cached token is stale or was revoked — drop it so the next
        // attempt re-reads from gh.
        forgetToken();
        throw new GhError(
          usesCli()
            ? "GitHub rejected the token from gh (invalid or expired)"
            : "GitHub rejected the Personal Access Token (invalid or expired)",
          usesCli()
            ? `Run \`${loginCommand(host())}\` to re-authenticate.`
            : "Update the Personal Access Token in extension preferences.",
        );
      }
      const ssoHeader = response.headers.get("x-github-sso");

      if (!response.ok) {
        throw new GraphQLError(`GitHub returned ${response.status}: ${text.trim().slice(0, 200)}`, ssoHeader);
      }

      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        // Truncated or otherwise unreadable: same position as a lost body, and
        // the mutation on the other end may well have been applied.
        if (!idempotent) throw new UnconfirmedWriteError("its response could not be read");
        throw new GraphQLError(`GitHub returned an unreadable response: ${text.trim().slice(0, 200)}`);
      }
      // `null`, a bare array, a quoted string: all parse cleanly and none of
      // them say anything about the mutation. Reading fields off one would
      // throw its way out of here as an ordinary failure.
      if (!isEnvelope(payload)) {
        if (!idempotent) throw new UnconfirmedWriteError("its response was not a GraphQL result");
        throw new GraphQLError(`GitHub returned an unexpected response: ${text.trim().slice(0, 200)}`);
      }
      const parsed = payload as GraphQLResponse<T>;
      // Likewise an `errors` that isn't a list — take it as no errors rather
      // than letting it break the checks below.
      const errors = Array.isArray(parsed.errors) ? parsed.errors : undefined;
      // A write is only settled once the response actually carries what the
      // mutation was asked to create; `data` alone can be there with the
      // mutation field null or missing.
      const written = idempotent || confirmsWrite(parsed.data);

      if (errors?.length) {
        const messages = errors.map(errorMessage);
        const joined = messages.join("; ");

        if (isSamlRefusal(messages, ssoHeader)) {
          lastSamlRefusal = { message: joined, ssoHeader: ssoHeader ?? undefined, at: Date.now() };
          // A multi-org search returns results for the orgs we *can* see plus
          // an error for the protected one. Throwing would discard perfectly
          // good data and show nothing; better to hand back what GitHub gave
          // us and let the view flag the gap.
          if (parsed.data && written) return parsed.data;
        }
        if (!idempotent) {
          // Partial result: GitHub answered with the comment it created and an
          // error on something else in the selection. The write landed, which
          // is the part the composer needs, so report it as posted.
          if (written) return parsed.data as T;
          // No result to go on. Only an error GitHub raised before running the
          // mutation rules the write out; anything else leaves it open.
          if (!rejectedBeforeWrite(errors)) {
            throw new UnconfirmedWriteError(`GitHub answered with an error: ${joined}`);
          }
        }
        throw new GraphQLError(joined, ssoHeader);
      }
      // Valid JSON that says nothing about what GitHub did with the mutation —
      // no data at all, or data without the comment — is unconfirmed too.
      if (!written) {
        throw new UnconfirmedWriteError(
          parsed.data ? "its response left the result out" : "its response carried no result",
        );
      }
      return parsed.data as T;
    }

    throw lastError ?? new GraphQLError("GitHub request failed");
  } finally {
    release();
  }
}
