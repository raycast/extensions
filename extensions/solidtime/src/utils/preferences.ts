import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

const PreferencesSchema = z.object({
  apiKey: z.string().min(1),
});

export function usePreferences() {
  const preferences = getPreferenceValues();
  return PreferencesSchema.parse(preferences);
}
