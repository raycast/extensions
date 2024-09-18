import { environment, getPreferenceValues } from "@raycast/api";
import { VAULT_TIMEOUT_MS_TO_LABEL } from "~/constants/labels";
import { CommandName } from "~/types/general";

export function getServerUrlPreference(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  if (serverUrl === "" || serverUrl === "bitwarden.com" || serverUrl === "https://bitwarden.com") {
    return "";
  }
  return serverUrl;
}

type PreferenceKeyOfCommandsWithTransientOptions =
  | keyof Preferences.Search
  | keyof Preferences.GeneratePassword
  | keyof Preferences.GeneratePasswordQuick;

type TransientOptionsValue =
  | Preferences.Search["transientCopySearch"]
  | Preferences.GeneratePassword["transientCopyGeneratePassword"]
  | Preferences.GeneratePasswordQuick["transientCopyGeneratePasswordQuick"];

const COMMAND_NAME_TO_PREFERENCE_KEY_MAP: Record<CommandName, PreferenceKeyOfCommandsWithTransientOptions> = {
  search: "transientCopySearch",
  "generate-password": "transientCopyGeneratePassword",
  "generate-password-quick": "transientCopyGeneratePasswordQuick",
};

type Preferences = Preferences.Search & Preferences.GeneratePassword & Preferences.GeneratePasswordQuick;

export function getTransientCopyPreference(type: "password" | "other"): boolean {
  const preferenceKey = COMMAND_NAME_TO_PREFERENCE_KEY_MAP[environment.commandName as CommandName];
  const transientPreference = getPreferenceValues<Preferences>()[preferenceKey] as TransientOptionsValue;
  if (transientPreference === "never") return false;
  if (transientPreference === "always") return true;
  if (transientPreference === "passwords") return type === "password";
  return true;
}

export function getLabelForTimeoutPreference(timeout: string | number): string | undefined {
  return VAULT_TIMEOUT_MS_TO_LABEL[timeout as keyof typeof VAULT_TIMEOUT_MS_TO_LABEL];
}
