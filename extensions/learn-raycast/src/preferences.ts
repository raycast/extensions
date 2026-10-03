import { getPreferenceValues } from "@raycast/api";

export interface LearnPreferences {
  learnExecutable?: string;
}

export function getLearnExecutable(): string {
  return (
    getPreferenceValues<LearnPreferences>().learnExecutable?.trim() || "learn"
  );
}
