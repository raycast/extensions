import { environment, getPreferenceValues } from "@raycast/api";
import { VAULT_TIMEOUT_MS_TO_LABEL } from "~/constants/labels";
import { CommandName } from "~/types/general";
import { Preferences, TransientCopyPreferences } from "~/types/preferences";

export function getServerUrlPreference(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  if (serverUrl === "" || serverUrl === "bitwarden.com" || serverUrl === "https://bitwarden.com") {
    return "";
  }
  return serverUrl;
}

const COMMAND_NAME_TO_PREFERENCE_KEY_MAP: Record<CommandName, keyof TransientCopyPreferences> = {
  search: "transientCopySearch",
  "generate-password": "transientCopyGeneratePassword",
  "generate-password-quick": "transientCopyGeneratePasswordQuick",
};

export function getTransientCopyPreference(type: "password" | "other"): boolean {
  const preferenceKey = COMMAND_NAME_TO_PREFERENCE_KEY_MAP[environment.commandName as CommandName];
  const transientPreference = getPreferenceValues<Preferences>()[preferenceKey];
  if (transientPreference === "never") return false;
  if (transientPreference === "always") return true;
  if (transientPreference === "passwords") return type === "password";
  return true;
}

export function getLabelForTimeoutPreference(timeout: string | number): string {
  return VAULT_TIMEOUT_MS_TO_LABEL[timeout as keyof typeof VAULT_TIMEOUT_MS_TO_LABEL] ?? timeout.toString();
}
