import { getPreferenceValues } from "@raycast/api";

export function hostedUrl(gistId: string): string {
  const { hostBaseUrl } = getPreferenceValues<Preferences>();
  return `${hostBaseUrl}${gistId}`;
}
