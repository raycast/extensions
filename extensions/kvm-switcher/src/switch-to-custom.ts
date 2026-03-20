import { getPreferenceValues } from "@raycast/api";
import { switchMonitorInput } from "./switch-util";

export default async function main() {
  const { customCode } = getPreferenceValues<Preferences.SwitchToCustom>();

  await switchMonitorInput(customCode, `Custom (${customCode})`);
}
