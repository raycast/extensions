import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { logger } from "@chrismessina/raycast-logger";
import type { CheckResult, CheckTarget } from "../catalog/types";
import { fitsPattern } from "../utils/pattern";
import { siteFetch } from "./transport";
import { cleanProfile } from "./url";

export interface CheckOptions {
  fetchImpl?: typeof fetch;
  /** Cancels the check. A canceled check throws instead of returning a result. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

// Turn on Debug Logging in the extension's preferences to see every request in the console
const log = logger.child("[Check]");

// Sherlock's default; some sites answer a bare Node user agent with a bot wall
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0";

// Bot-protection pages. A site that shows one said nothing about the profile. From Sherlock's WAFHitMsgs.
const BOT_WALL_MARKERS = [
  '<span id="challenge-error-text">',
  "AwsWafIntegration.forceRefreshToken",
  '"perimeterxIdentifiers"',
  "body.no-js .challenge-running{display:none}",
  // TikTok's regional block page, which Sherlock lists as a "not found" message: it's a refusal, not an answer
  "Govt. of India decided to block",
];

// Statuses that mean the site refused to answer, not that the profile is missing. 406 is what bot walls such as
// Anubis send a script (gitlab.gnome.org, 2026-11); 999 is LinkedIn's.
const REFUSED_STATUSES = new Set([401, 403, 406, 429, 999]);

const GONE_STATUSES = new Set([404, 410]);

// Every marker a check looks for sits near the top of a page; reading past this only holds a slow site's huge page in
// memory
const MAX_BODY_BYTES = 2 * 1024 * 1024;

async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (bytes >= MAX_BODY_BYTES) {
      void reader.cancel().catch(() => undefined);
      return text;
    }
  }
  return text + decoder.decode();
}

const fill = (template: string, value: string) => template.replace(/{profile}/g, value);

class TimeoutError extends Error {
  constructor() {
    super("Timed out");
  }
}

/**
 * Race a request against the timeout and the caller's cancel. fetch should stop on the abort signal by itself; the
 * race also covers a response body that never finishes.
 */
function withDeadline<T>(work: Promise<T>, controller: AbortController, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError());
    }, timeoutMs);
    const onCancel = () => {
      controller.abort();
      reject(signal?.reason ?? new Error("Canceled"));
    };
    signal?.addEventListener("abort", onCancel, { once: true });
    work.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onCancel);
    });
  });
}

async function runCheck(target: CheckTarget, username: string, options: CheckOptions = {}): Promise<CheckResult> {
  const { fetchImpl = siteFetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const { check } = target;
  const profile = cleanProfile(username);

  if (target.usernamePattern && !fitsPattern(target.usernamePattern, profile)) {
    return { status: "invalid" };
  }

  const statusOnly = check.signals.every((s) => s === "status");
  const method = check.method ?? (statusOnly ? "HEAD" : "GET");
  const url = fill(check.probeUrl ?? target.urlTemplate, encodeURIComponent(profile));
  const controller = new AbortController();
  signal?.throwIfAborted();

  let status: number;
  let text = "";
  try {
    const request = async () => {
      const response = await fetchImpl(url, {
        method,
        headers: { "User-Agent": USER_AGENT, ...check.headers },
        body: check.body ? fill(check.body, profile) : undefined,
        redirect: check.signals.includes("redirect") ? "manual" : "follow",
        signal: controller.signal,
      });
      return { status: response.status, text: method === "HEAD" ? "" : await readBody(response) };
    };
    ({ status, text } = await withDeadline(request(), controller, timeoutMs, signal));
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: "error", error: getErrorMessage(error) };
  }

  if (REFUSED_STATUSES.has(status) || BOT_WALL_MARKERS.some((marker) => text.includes(marker))) {
    return { status: "blocked", httpStatus: status };
  }

  const saysNotFound =
    check.signals.includes("message") &&
    ((check.notFoundText ?? []).some((marker) => text.includes(marker)) ||
      (check.notFoundBody !== undefined && text.trim() === check.notFoundBody));
  // The site won't take this kind of request (a HEAD, usually), which says nothing about the profile
  if (status === 405) {
    return { status: "error", httpStatus: status, error: "The site refused this kind of request" };
  }
  // A server error says the site failed, not that the profile is missing, unless the page says so
  if (status >= 500 && !saysNotFound) {
    return { status: "error", httpStatus: status, error: `The site answered ${status}` };
  }
  // A check that reads the page has no rule for other client errors: Discord answers a username it won't accept
  // with a 400 whose body holds none of its "not taken" text, which isn't a profile either way
  const readsStatus = check.signals.some((s) => s === "status" || s === "redirect");
  if (status >= 400 && !readsStatus && !GONE_STATUSES.has(status) && !saysNotFound) {
    return { status: "error", httpStatus: status, error: `The site answered ${status}` };
  }

  const notFound =
    // A site that says the page is gone means it, even when its 404 page lacks the text a check looks for
    GONE_STATUSES.has(status) ||
    saysNotFound ||
    (readsStatus && (status < 200 || status >= 300 || (check.notFoundStatus ?? []).includes(status)));

  return { status: notFound ? "not-found" : "found", httpStatus: status };
}

/**
 * Ask a site whether a profile exists, the way Sherlock does
 * @throws only when `options.signal` cancels the check
 */
export async function checkProfile(
  target: CheckTarget,
  username: string,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const url = (target.check.probeUrl ?? target.urlTemplate).replace(/{profile}/g, cleanProfile(username));
  const startedAt = Date.now();
  try {
    const result = await runCheck(target, username, options);
    log.log(`${result.status} ${url}`, {
      ...(result.httpStatus !== undefined && { httpStatus: result.httpStatus }),
      ...(result.error !== undefined && { error: result.error }),
      ms: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    log.log(`canceled ${url}`, { ms: Date.now() - startedAt });
    throw error;
  }
}
