import { getPreferenceValues } from "@raycast/api";

export enum NoteplanFlavour {
  AppStore = "appstore",
  SetApp = "setapp",
}

interface Preferences {
  fileExtension: string;
  noteplanFlavour: NoteplanFlavour;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
