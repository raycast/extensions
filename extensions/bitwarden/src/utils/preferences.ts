import { environment, getPreferenceValues } from "@raycast/api";
import { CommandName } from "~/types/general";
import { Preferences, TransientCopyOption } from "~/types/preferences";

export function getServerUrlPreference(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  if (serverUrl === "" || serverUrl === "bitwarden.com" || serverUrl === "https://bitwarden.com") {
    return "";
  }
  return serverUrl;
}

const COMMAND_NAME_TO_PREFERENCE_KEY_MAP: Record<CommandName, keyof Preferences> = {
  search: "transientSearchOption",
  "generate-password": "transientGenerateOption",
  "generate-password-quick": "transientGenerateQuickOption",
};

export function getTransientCopyPreference(type: "password" | "other"): boolean {
  const preferenceKey = COMMAND_NAME_TO_PREFERENCE_KEY_MAP[environment.commandName as CommandName];
  const transientPreference = getPreferenceValues<Preferences>()[preferenceKey] as TransientCopyOption;
  if (transientPreference === "never") return false;
  if (transientPreference === "always") return true;
  if (transientPreference === "passwords") return type === "password";
  return true;
}
