// url-sanitizer.tsx

import { URL } from "url";
import { File } from "../types";

/**
 * Sanitizes a URL for comparison by:
 * 1. Removing protocol (http/https)
 * 2. Removing www prefix
 * 3. Removing trailing slashes
 * 4. Converting to lowercase
 * 5. Removing query parameters
 * 6. Removing hash fragments
 */
export function sanitizeUrl(urlString: string): string {
  try {
    // Parse the URL
    const url = new URL(urlString);

    // Get the hostname and path
    let hostname = url.hostname.toLowerCase();
    let path = url.pathname;

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    // Remove trailing slashes from path
    while (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // Combine hostname and path
    return hostname + path;
  } catch (e) {
    // If URL parsing fails, do basic sanitization
    return urlString
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/+$/, "")
      .split("?")[0]
      .split("#")[0];
  }
}

/** Query parameters that only track where a visit came from. */
const TRACKING_PARAM =
  /^(utm_\w+|fbclid|gclid|dclid|msclkid|yclid|twclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src|si)$/i;

/**
 * Normalizes a URL for telling whether two URLs point to the same page. Like
 * `sanitizeUrl`, but keeps the query parameters that identify the page — two
 * YouTube videos differ only by `?v=` — dropping tracking ones and ignoring
 * their order.
 */
export function comparableUrl(urlString: string): string {
  try {
    const params = [...new URL(urlString).searchParams]
      .filter(([key]) => !TRACKING_PARAM.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = new URLSearchParams(params).toString();
    return sanitizeUrl(urlString) + (query ? `?${query}` : "");
  } catch (e) {
    return sanitizeUrl(urlString);
  }
}

export function isSameUrl(a: string, b: string): boolean {
  return comparableUrl(a) === comparableUrl(b);
}

/**
 * Checks if a URL exists in a list of files by comparing normalized URLs
 */
export function findDuplicateBookmark(url: string, files: File[]): File | undefined {
  return files.find((file) => isSameUrl(url, file.attributes.source));
}
