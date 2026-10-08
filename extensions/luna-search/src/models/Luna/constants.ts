import { Request, PageContext } from "./Request";

/**
 * The default timeout for API requests, in milliseconds.
 */
export const DEFAULT_TIMEOUT_S = 3000;

/**
 * The default page ID used in the page context for API requests.
 */
export const DEFAULT_PAGE_ID = "default";

/**
 * The page type used for search-related API requests.
 */
export const SEARCH_PAGE_TYPE = "multistate_search_results";

/**
 * The feature scheme used for API requests.
 */
export const FEATURE_SCHEME = "WEB_V1";

/**
 * The default headers used for API requests, as provided by network tools.
 * These headers include information about the user agent, accept encoding,
 * referrer, and other metadata relevant to the API endpoint.
 */
export const DEFAULT_HEADERS = {
  "User-Agent": "RAYCAST",
  Accept: "*/*",
  "Accept-Language": "en-US",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Referer: "https://luna.amazon.com/",
  "x-amz-timezone": "America/Los_Angeles",
  "x-amz-device-type": "browser",
  "x-amz-platform": "web",
  "x-amz-locale": "en_US",
  "x-amz-marketplace-id": "ATVPDKIKX0DER",
  "x-amz-country-of-residence": "US",
  "Content-Type": "text/plain;charset=UTF-8",
  Origin: "https://luna.amazon.com",
};

/**
 * The default page context used in API requests, which requires a pageType to be specified by the consumer.
 */
const DEFAULT_PAGE_CONTEXT: PageContext = {
  pageType: "",
  pageId: DEFAULT_PAGE_ID,
};

/**
 * A basic request object that is pre-filled with the default values,
 * including the timeout, feature scheme, page context, and client context.
 * This can be used as a base for constructing more specific API requests.
 */
export const BASE_REQUEST: Request = {
  timeout: DEFAULT_TIMEOUT_S,
  featureScheme: FEATURE_SCHEME,
  pageContext: DEFAULT_PAGE_CONTEXT,
  clientContext: {
    browserMetadata: {
      browserType: "RAYCAST",
    },
  },
};
