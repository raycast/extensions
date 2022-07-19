import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  specialCharacters: string;
  strength: number;
  length: number;
  delimiter: string;
  maxWordLength: number;
};

const usePreferences = (): Preferences => {
  const { strength, length, maxWordLength, ...preferences } = getPreferenceValues<Record<keyof Preferences, string>>();

  return {
    ...preferences,
    strength: parseInt(strength, 10),
    length: parseInt(length, 10),
    maxWordLength: parseInt(maxWordLength, 10),
  } as Preferences;
};

export default usePreferences;
