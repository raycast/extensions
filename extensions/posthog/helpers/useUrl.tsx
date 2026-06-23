import { getPreferenceValues } from "@raycast/api";

function normalizeHost(host?: string) {
  if (!host) return "https://us.posthog.com";
  const normalized = host.replace(/\/$/, "");
  if (normalized === "https://app.posthog.com") return "https://us.posthog.com";
  return normalized;
}

export function useUrl(path: string) {
  const { dataRegionURL } = getPreferenceValues<{ dataRegionURL?: string }>();
  return `${normalizeHost(dataRegionURL)}/${path}`;
}
