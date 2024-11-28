import { getPreferenceValues } from "@raycast/api";

export const { weekStart, commandMetadata, birthday, progressSymbol, showProgressBar, countdownDateFirst } =
  getPreferenceValues<Preferences>();
