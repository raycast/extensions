import { Application, getPreferenceValues } from "@raycast/api";

export const bundleIds = <const>["com.lukilabs.lukiapp", "com.lukilabs.lukiapp-setapp"];

export interface GlobalPreferences {
  application: Application;
}

export interface SearchPreferences {
  useDetailedView: boolean;
}

export interface DailyNotePreferences {
  appendPosition: "end" | "beginning";
  addTimestamp: boolean;
  timeFormat: string;
  contentPrefix: string;
  contentSuffix: string;
}

export const getPreferences = (): GlobalPreferences => {
  return getPreferenceValues<GlobalPreferences>();
};

export const getSearchPreferences = (): SearchPreferences => {
  return getPreferenceValues<SearchPreferences>();
};

export const getDailyNotePreferences = (): DailyNotePreferences => {
  return getPreferenceValues<DailyNotePreferences>();
};
