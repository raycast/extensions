import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const showFrozenOrPausedAssets = preferences.showFrozenOrPausedAssets;

export const includeIncentivePrograms = preferences.includeIncentivePrograms;
