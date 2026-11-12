import { LocalStorage } from "@raycast/api";
import { checkSetup } from "../services/ai-search";
import { parseScanSettings, SETTINGS_KEY } from "../services/scan-settings";

/** Check npkill/Node compatibility and saved scan settings without scanning or changing files. Use for setup or configuration questions. */
export default async function tool() {
  return checkSetup(parseScanSettings(await LocalStorage.getItem<string>(SETTINGS_KEY)));
}
