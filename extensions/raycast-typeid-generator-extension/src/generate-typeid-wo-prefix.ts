import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { typeid } from "typeid-js";

export default async function generateTypeidWPrefix() {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.disableCopyToClipboard && !preferences.insert) {
    await showHUD("Doing nothing.");
    return;
  }

  const uuid = typeid().toString();

  if (!preferences.disableCopyToClipboard) {
    await Clipboard.copy(uuid);
    await showHUD(`✅ Copied new UUID: ${uuid}`);
  }

  if (preferences.insert) {
    await Clipboard.paste(uuid);
    await showHUD(`✅ Inserted new UUID: ${uuid}`);
  }
}
