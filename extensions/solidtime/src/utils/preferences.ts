import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

const PreferencesSchema = z.object({
  url: z
    .string()
    .min(1)
    .transform((url) => {
      const base = url.startsWith("http") ? url : `https://${url}`;
      const solidtimeUrl = new URL("api", base).toString();
      return solidtimeUrl;
    }),
  apiKey: z.string().min(1),
  onTimeEntryAction: z.enum(["close", "stay"]),
});

export function usePreferences() {
  const preferences = getPreferenceValues();
  return PreferencesSchema.parse(preferences);
}
