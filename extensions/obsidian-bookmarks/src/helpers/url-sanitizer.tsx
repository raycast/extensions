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

/**
 * Checks if a URL exists in a list of files by comparing sanitized URLs
 */
export function findDuplicateBookmark(url: string, files: File[]): File | undefined {
  const sanitizedNewUrl = sanitizeUrl(url);

  return files.find((file) => {
    const sanitizedExistingUrl = sanitizeUrl(file.attributes.source);
    return sanitizedNewUrl === sanitizedExistingUrl;
  });
}
