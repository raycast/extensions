import { open } from "@raycast/api";
import { SUPERWHISPER_BUNDLE_ID, checkSuperwhisperInstallation } from "./utils";

export default async function main() {
  const isInstalled = await checkSuperwhisperInstallation();
  if (!isInstalled) {
    return;
  }

  await open("superwhisper://settings", SUPERWHISPER_BUNDLE_ID);
}
