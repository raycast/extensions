// :copyright: Copyright (c) 2023 ftrack
import { Session } from "@ftrack/api";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

const preferences = getPreferenceValues<Preferences>();

export const session = new Session(preferences.ftrackServerUrl, preferences.ftrackApiUser, preferences.ftrackApiKey, {
  strictApi: true,
});
