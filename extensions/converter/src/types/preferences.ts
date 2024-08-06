import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  autoDetect: boolean;
  priorityDetection: string;
  advanceView: boolean;
  advanceViewLocation: string;
}
export const { autoDetect, priorityDetection, advanceView, advanceViewLocation } = getPreferenceValues<Preferences>();
