// Production API base. Not configurable via preferences for v1 to keep the
// configuration surface clean; promote to a preference if a staging environment
// is needed later.
export const API_BASE_URL = "https://flowferry.app";

export const ARTICLES_ENDPOINT = `${API_BASE_URL}/api/v1/articles`;

// User-Agent identifying this extension when fetching arbitrary article URLs
// via the Save URL command.
export const USER_AGENT = "Mozilla/5.0 (compatible; FlowFerryRaycast/1.0; +https://flowferry.app)";

// Hard cap on fetched HTML size to avoid pulling enormous pages over to the
// extractor.
export const FETCH_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const FETCH_TIMEOUT_MS = 15_000;
