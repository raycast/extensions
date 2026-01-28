import { getPreferenceValues } from "@raycast/api";

export function useAuth() {
  const preferences = getPreferenceValues<{ dovetailApiToken: string }>();
  const token = preferences.dovetailApiToken;
  return { token };
}
