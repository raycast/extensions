/** Companies House Public Data API base URL. */
export const API_BASE = "https://api.company-information.service.gov.uk";

/**
 * Filed documents live on a separate host to the rest of the API, and behind a
 * two-step flow: metadata first, then a content request that redirects to a
 * short-lived signed URL.
 */
export const DOCUMENT_API_BASE =
  "https://document-api.company-information.service.gov.uk";

/**
 * The public "Find and update company information" website. Used for the
 * "Open on Companies House" actions so people can view the full record online.
 */
export const WEB_BASE =
  "https://find-and-update.company-information.service.gov.uk";

/** Number of items requested per page. The API pages by `start_index` offset. */
export const PAGE_SIZE = 20;

/**
 * Companies House serves search results only within the first 1,000 hits and
 * answers a `start_index` of 1,000 or more with a 416, so paging to the
 * reported total would end in an error rather than the end of the list.
 */
export const SEARCH_INDEX_LIMIT = 1000;
