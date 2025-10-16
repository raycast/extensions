import { getPreferenceValues } from "@raycast/api";

const BASE_URL = new URL("https://read.readwise.io/");
const WISEREAD_SCHEME = "wiseread:";

interface Preferences {
  token: string;
  openInDesktopApp: boolean;
}

/**
 * Constructs a URL for opening a resource in either the desktop app or web browser.
 *
 * @param path - The path to append to the base URL.
 * @returns A properly formatted URL string.
 */
export function getOpenUrl(path: string): string {
  const preferences = getPreferenceValues<Preferences>();

  // Ensure path starts with / for proper URL construction
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (preferences.openInDesktopApp) {
    return `${WISEREAD_SCHEME}//${normalizedPath.slice(1)}`;
  } else {
    const url = new URL(normalizedPath, BASE_URL);
    return url.toString();
  }
}

/**
 * Converts a full URL to the appropriate format for opening.
 *
 * @param fullUrl - The complete URL to convert.
 * @returns A URL string formatted for the user's preferred app.
 * @throws Error if the provided URL is invalid.
 */
export function getOpenUrlFromFullUrl(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);

    // Construct the path with search params and hash
    const pathWithParams = url.pathname + url.search + url.hash;

    return getOpenUrl(pathWithParams);
  } catch {
    throw new Error(`Invalid URL provided: ${fullUrl}`);
  }
}
