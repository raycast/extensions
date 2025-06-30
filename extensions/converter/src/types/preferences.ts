import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  autoPaste: boolean;
  asciiCommaSeparated: boolean;
  advanceView: boolean;
  advanceViewLocation: string;
}
export const { autoPaste, asciiCommaSeparated, advanceView, advanceViewLocation } = getPreferenceValues<Preferences>();
