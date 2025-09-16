import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const showFrozenOrPausedAssets = preferences.showFrozenOrPausedAssets;

export const includeMeritPrograms = preferences.includeMeritPrograms;
