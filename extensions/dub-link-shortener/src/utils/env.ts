import { environment, getPreferenceValues } from "@raycast/api";

export const { workspaceApiKey } = getPreferenceValues<Preferences>();

export const { extensionName, commandName } = environment;
