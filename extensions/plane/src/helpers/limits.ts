/**
 * Limits for endpoints that fan out over projects. Plane's API allows 60 requests/minute per key,
 * and v1 has no workspace-wide filtered work item list.
 */

/** Projects scanned at most. */
export const MAX_PROJECTS = 20;
/** Pages of 100 work items scanned per project at most (most recently updated first). */
export const MAX_PAGES_PER_PROJECT = 3;
/** Work item list requests per refresh. */
export const MAX_SCAN_REQUESTS = 40;
/** Parallel requests. */
export const SCAN_CONCURRENCY = 3;

/**
 * Limits for the filtered backends (API v2, custom v1 filters), which list only the user's work items
 * workspace-wide. Open items are paged up to the cap; closed ones are only the most recently updated page.
 */
export const FILTERED_PAGE_SIZE = 100;
/** Pages of open work items per view at most. */
export const MAX_FILTERED_OPEN_PAGES = 5;
/** Most recently updated completed or cancelled work items per view. */
export const MAX_FILTERED_CLOSED_ITEMS = 50;
/** How long the AI tool reuses the result the command or menu bar fetched. */
export const SHARED_RESULT_MAX_AGE_MS = 2 * 60 * 1000;

/** Pages Search Pages lists at most per workspace or project (10 requests of 100). */
export const MAX_LISTED_PAGES = 1000;
/** Rows per request when listing pages. */
export const PAGES_PER_REQUEST = 100;
