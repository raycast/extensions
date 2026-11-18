import { getPreferenceValues } from "@raycast/api";

export const grandfatheredApiKey = (): string | undefined =>
  getPreferenceValues<Preferences>().apiKey?.trim() || undefined;
