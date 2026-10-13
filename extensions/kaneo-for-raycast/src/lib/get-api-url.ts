import { getPreferenceValues } from "@raycast/api";

export function getApiUrl(path: string) {
  const { instanceUrl } = getPreferenceValues<Preferences>();

  const base = instanceUrl.trim().replace(/\/+$/, "");
  const baseUrl = base.endsWith("/api") ? base : `${base}/api`;
  const unprefixedPath = path.replace(/^\/+/, "").replace(/^api\/?/, "");

  return `${baseUrl}/${unprefixedPath}`;
}

/**
 * Resolve an image reference for Raycast.
 * Absolute URLs (http/https, protocol-relative, data URIs) are returned as-is;
 * relative paths are resolved against the API base.
 */
export function resolveImageUrl(image: string): string {
  if (/^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(image)) {
    return image;
  }
  return getApiUrl(image);
}
