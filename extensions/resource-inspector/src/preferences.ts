import { getPreferenceValues } from "@raycast/api";
import { TrackingScope } from "./tracking";

export function trackingScope(): TrackingScope {
  const value = getPreferenceValues<{ trackingScope?: string }>().trackingScope;
  return value === "all" || value === "apps" ? value : "third-party";
}
