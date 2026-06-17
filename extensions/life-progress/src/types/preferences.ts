import { getPreferenceValues } from "@raycast/api";

export const { weekStart, birthday, progressSymbol, showProgressBar, countdownDateFirst } =
  getPreferenceValues<Preferences>();
export const { colorIcon, showTitle, commandMetadata, hour24 } = getPreferenceValues<Preferences.LifeProgressMenubar>();
