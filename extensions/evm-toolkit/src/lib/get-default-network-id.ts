import { getPreferenceValues } from "@raycast/api";

export function getDefaultNetworkId(): string {
  const { defaultNetwork } = getPreferenceValues<Preferences>();
  return defaultNetwork || "1";
}
