import { isRecord } from "../utils/is-record";
import type { CatalogSite, CheckSignal, CheckStatus, ProfileCheck, Reliability } from "./types";

/**
 * Reading Sherlock's data.json (https://github.com/sherlock-project/sherlock, MIT). Used by the catalog sync script;
 * the extension reads the converted copy in sherlock.json.
 */

const EXCLUDED_SITES = new Set([
  // Not profiles: checking one sends the username to a service built on stolen data
  "HudsonRock",
  "BreachSta.rs Forum",
  // The built-in Bluesky app covers it, checking any ATProto handle rather than only bsky.social ones
  "Bluesky",
]);

const SIGNALS: Record<string, CheckSignal> = { status_code: "status", message: "message", response_url: "redirect" };
const METHODS = new Set(["GET", "HEAD", "POST", "PUT"]);

const toList = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const fillPlaceholder = (text: string) => text.replace(/{}/g, "{profile}");

// A site's ID is also its app ID once added, so it must never change for the same name
function catalogIdFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `catalog-${slug}`;
}

/**
 * Python reads `{,34}` as "up to 34", where JavaScript matches the text `{,34}` itself. Spell each such limit `{0,34}`,
 * skipping escaped characters and character classes, where a brace is only a brace.
 */
function convertOpenLimits(pattern: string): string {
  let out = "";
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "\\") {
      out += pattern.slice(index, index + 2);
      index++;
    } else if (inClass) {
      if (char === "]") inClass = false;
      out += char;
    } else if (char === "[") {
      inClass = true;
      out += char;
      // A ] right after [ or [^ is part of the class, not its end
      const lead = pattern.slice(index + 1).match(/^\^?\]?/)?.[0] ?? "";
      out += lead;
      index += lead.length;
    } else {
      const limit = char === "{" ? pattern.slice(index).match(/^\{,(\d+)\}/) : null;
      if (limit) {
        out += `{0,${limit[1]}}`;
        index += limit[0].length - 1;
      } else {
        out += char;
      }
    }
  }
  return out;
}

/** Sherlock's regexes are Python's; keep only those JavaScript reads the same way */
function portablePattern(pattern: unknown): string | undefined {
  if (typeof pattern !== "string") return undefined;
  const converted = convertOpenLimits(pattern);
  try {
    new RegExp(converted);
    return converted;
  } catch {
    return undefined;
  }
}

function toCheck(site: Record<string, unknown>): ProfileCheck | undefined {
  const signals = toList(site.errorType as string | string[]).map((type) => SIGNALS[type]);
  if (signals.length === 0 || signals.some((signal) => !signal)) return undefined;

  const check: ProfileCheck = { signals };
  if (typeof site.urlProbe === "string") check.probeUrl = fillPlaceholder(site.urlProbe);
  if (typeof site.request_method === "string" && METHODS.has(site.request_method)) {
    check.method = site.request_method as ProfileCheck["method"];
  }
  if (isRecord(site.headers)) check.headers = site.headers as Record<string, string>;
  if (site.request_payload !== undefined) check.body = fillPlaceholder(JSON.stringify(site.request_payload));
  const notFoundText = toList(site.errorMsg as string | string[]).filter((text) => typeof text === "string");
  if (notFoundText.length > 0) check.notFoundText = notFoundText;
  const notFoundStatus = toList(site.errorCode as number | number[]).filter(Number.isInteger);
  if (notFoundStatus.length > 0) check.notFoundStatus = notFoundStatus;
  return check;
}

/**
 * Convert Sherlock's sites. A site whose check this extension can't run is left out.
 */
export function normalizeSherlock(raw: Record<string, unknown>): Omit<CatalogSite, "reliability">[] {
  const sites: Omit<CatalogSite, "reliability">[] = [];
  for (const [name, value] of Object.entries(raw)) {
    if (name.startsWith("$") || EXCLUDED_SITES.has(name) || !isRecord(value)) continue;
    if (typeof value.url !== "string" || typeof value.username_claimed !== "string") continue;
    const check = toCheck(value);
    if (!check) continue;
    sites.push({
      id: catalogIdFor(name),
      name,
      // Without the placeholder the URL is just the home page: Discord's check only says whether a name is taken
      urlTemplate: value.url.includes("{}") ? fillPlaceholder(value.url) : undefined,
      homepage: typeof value.urlMain === "string" ? value.urlMain : value.url,
      usernamePattern: portablePattern(value.regexCheck),
      knownUsername: value.username_claimed,
      nsfw: value.isNSFW === true,
      check,
    });
  }
  return sites;
}

/**
 * Grade a site from its answers for a username that exists and one that doesn't
 */
export function gradeProbe(known: CheckStatus, nonsense: CheckStatus): Reliability {
  const knownRight = known === "found";
  // "invalid" means the nonsense name was never requested, so the site's "no such profile" answer is untested
  const nonsenseRight = nonsense === "not-found";
  if (knownRight && nonsenseRight) return "works";
  const answered = (status: CheckStatus) => status === "found" || status === "not-found";
  // A wrong answer the site gave on purpose; a refusal or a failure says nothing either way
  if ((answered(known) && !knownRight) || nonsense === "found") return "unreliable";
  return "unverified";
}
