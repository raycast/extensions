import { getPreferenceValues } from "@raycast/api";

export function add_system_service(): boolean | undefined {
  const { add_system_service } = getPreferenceValues<Preferences>();
  return add_system_service;
}

export function use_built_in_BCLM(): boolean | undefined {
  const { use_built_in_BCLM } = getPreferenceValues<Preferences>();
  return use_built_in_BCLM;
}
