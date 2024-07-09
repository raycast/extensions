import { environment, getPreferenceValues } from "@raycast/api";

export const { apiKey } = getPreferenceValues<Preferences>();

export const { extensionName, commandName } = environment;
