import type { PlatformId } from "./platforms";

/**
 * What tells a site's "profile exists" response apart from its "no such profile" one. Mirrors Sherlock's errorType:
 * - `status`: a 2xx means found
 * - `message`: the page contains one of `notFoundText` when the profile doesn't exist
 * - `redirect`: the site redirects away when the profile doesn't exist (the request doesn't follow redirects)
 */
export type CheckSignal = "status" | "message" | "redirect";

export interface ProfileCheck {
  signals: CheckSignal[];
  /** URL to request instead of the profile URL, usually an API. `{profile}` is filled in. */
  probeUrl?: string;
  method?: "GET" | "HEAD" | "POST" | "PUT";
  headers?: Record<string, string>;
  /** Request body, `{profile}` filled in */
  body?: string;
  notFoundText?: string[];
  /** The whole body, trimmed, when the profile doesn't exist: `[]` from an API that lists matches */
  notFoundBody?: string;
  /** Statuses that mean not found even when they are 2xx */
  notFoundStatus?: number[];
}

/**
 * - `invalid`: the username can't exist on the site, so it wasn't requested
 * - `blocked`: rate limit, refusal or a bot-protection page; the site's answer says nothing about the profile
 * - `error`: network failure or timeout
 */
export type CheckStatus = "found" | "not-found" | "invalid" | "blocked" | "error";

export interface CheckResult {
  status: CheckStatus;
  httpStatus?: number;
  error?: string;
}

/** Anything that can be checked: an app, a catalog site */
export interface CheckTarget {
  urlTemplate: string;
  check: ProfileCheck;
  usernamePattern?: string;
}

/**
 * How far a site's check can be trusted, from the probe the catalog sync runs with the site's known username and a
 * nonsense one:
 * - `works`: both answers were right
 * - `unverified`: the site refused or didn't answer, so the probe couldn't tell
 * - `unreliable`: a wrong answer, such as "found" for the nonsense name. Never searched.
 */
export type Reliability = "works" | "unverified" | "unreliable";

export interface CatalogSite {
  /** The app ID the site gets when it's opened or added, `catalog-` plus a slug of its name. Never changes. */
  id: string;
  name: string;
  /** Undefined for a site with no profile page, whose check only says whether the username is taken */
  urlTemplate?: string;
  homepage: string;
  usernamePattern?: string;
  /** A username Sherlock knows exists, used by the sync probe */
  knownUsername: string;
  nsfw: boolean;
  platform?: PlatformId;
  /** On an ATProto site, the server a bare name belongs to */
  handleDomain?: string;
  check: ProfileCheck;
  reliability: Reliability;
}
