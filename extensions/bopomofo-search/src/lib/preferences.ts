import { getPreferenceValues } from "@raycast/api";

const raycastPreferences = getPreferenceValues<Preferences>();

export const primaryAction: "copy" | "paste" = raycastPreferences.primaryAction || "paste";
