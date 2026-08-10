import { getPreferenceValues } from "@raycast/api";

function normalizeApiKey(value?: string | null): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

export function getPreferenceHugeiconsApiKey(): string | undefined {
  return normalizeApiKey(getPreferenceValues<Preferences>().apiKey);
}

export async function loadConfiguredHugeiconsApiKey(): Promise<string | undefined> {
  return getPreferenceHugeiconsApiKey();
}
