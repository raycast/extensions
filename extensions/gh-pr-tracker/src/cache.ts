import { LocalStorage } from "@raycast/api";
import type { PRWithActivity } from "./types";
import { storeLog as log, getErrorMessage } from "./logger";

const CACHE_KEY = "gh_pr_data_cache";

/** An array whose every element is a non-null object — what the activity builders assume. */
function isObjectArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((v) => v != null && typeof v === "object");
}

/**
 * Commits need a deeper check than the other collections: getAllActivity reaches two levels in
 * (`c.commit.message`, `c.commit.author.date`), so an element that is merely "an object" still
 * throws. Every other activity array is only shallowly dereferenced.
 */
function isCommitArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((c) => {
      if (c == null || typeof c !== "object") return false;
      const commit = (c as { commit?: { message?: unknown; author?: { date?: unknown } } }).commit;
      return (
        commit != null &&
        typeof commit === "object" &&
        typeof commit.message === "string" &&
        commit.author != null &&
        typeof commit.author === "object"
      );
    })
  );
}

export async function loadCachedPRs(): Promise<PRWithActivity[] | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    // Structural guard: a GitHub outage once returned null PRs to the official extension and
    // poisoned its cache. Valid JSON is not valid data — reject anything that isn't an array of
    // objects carrying the two fields every downstream consumer dereferences (prKey needs both).
    if (!Array.isArray(parsed)) {
      log.error("Cached PR data is not an array — discarding", { type: typeof parsed });
      return null;
    }
    // Guard every field consumed downstream, not just the prKey pair. getAllActivity immediately
    // dereferences user/reviews/reviewComments/issueComments/events/commits, so an entry that
    // satisfies only { repo, number } passes the guard and then crashes on access.
    const valid = parsed.filter((pr): pr is PRWithActivity => {
      if (pr == null || typeof pr !== "object") return false;
      const c = pr as Partial<PRWithActivity>;
      return (
        typeof c.repo === "string" &&
        typeof c.number === "number" &&
        c.user != null &&
        typeof c.user.login === "string" &&
        // Every element must be a non-null object: getAllActivity dereferences `r.state`,
        // `c.user.login`, `c.commit.author` etc. without guarding, so `[null]` passes a bare
        // Array.isArray check and then throws.
        isObjectArray(c.reviews) &&
        isObjectArray(c.reviewComments) &&
        isObjectArray(c.issueComments) &&
        isObjectArray(c.events) &&
        isCommitArray(c.commits) &&
        // Guard metadata fields added in v1.3.0+: matchesPrFilter dereferences these without
        // checking, so old cache entries lacking them crash the filter matcher.
        isObjectArray(c.assignees) &&
        isObjectArray(c.requested_reviewers) &&
        isObjectArray(c.labels) &&
        typeof c.draft === "boolean"
      );
    });
    if (valid.length !== parsed.length) {
      log.warn("Dropped malformed entries from cached PR data", {
        kept: valid.length,
        dropped: parsed.length - valid.length,
      });
    }
    return valid;
  } catch (error) {
    log.error("Cached PR data is corrupt and was discarded", {
      error: getErrorMessage(error),
      rawLength: raw.length,
    });
    return null;
  }
}

export async function saveCachedPRs(prs: PRWithActivity[]): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(prs));
}
