import { getPreferenceValues } from "@raycast/api";

export function getLearnExecutable(): string {
  return getPreferenceValues<Preferences>().learnExecutable?.trim() || "learn";
}
