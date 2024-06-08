import { getPreferenceValues } from "@raycast/api";

export function add_system_service(): boolean | undefined {
  const { add_system_service } = getPreferenceValues<Preferences>();
  return add_system_service;
}
