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
