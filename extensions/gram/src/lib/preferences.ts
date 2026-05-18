import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const gramBuild = preferences.build;

export const showGitBranch = preferences.showGitBranch;

export const projectIconStyle = preferences.projectIconStyle;

export const showOpenStatus = preferences.showOpenStatus;
