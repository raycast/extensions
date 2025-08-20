import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

const PreferencesSchema = z.object({
  apiKey: z.string().min(1),
  onTimeEntryAction: z.enum(["close", "stay"]),
  serverUrl: z.string().optional().default(""), // ✅ new field
});

export function usePreferences() {
  const preferences = getPreferenceValues<z.infer<typeof PreferencesSchema>>();
  return PreferencesSchema.parse(preferences);
}
