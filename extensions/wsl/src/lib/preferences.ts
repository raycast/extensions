import { getPreferenceValues } from "@raycast/api";

export function getPrefs() {
  const raw = getPreferenceValues<Preferences>();
  return {
    defaultDistro: raw.defaultDistro?.trim() || "",
    workingDirectory: raw.workingDirectory?.trim() || "~",
    shellType: raw.shellType || "bash",
  };
}
