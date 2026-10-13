import { getPreferenceValues } from "@raycast/api";

export function getApiUrl(path: string) {
  const { instanceUrl } = getPreferenceValues<{ instanceUrl: string }>();

  const base = instanceUrl.replace(/\/+$/, "");
  const baseUrl = base.endsWith("/api") ? base : `${base}/api`;
  const unprefixedPath = path.replace(/^\/+/, "").replace(/^api\/?/, "");

  return `${baseUrl}/${unprefixedPath}`;
}
