import { getPreferenceValues, showHUD, Clipboard } from "@raycast/api";
import { Preferences } from "./preferences";
import { sendMessage } from "./telegram";

export default async function SendCliboardCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const text = await Clipboard.readText();
  if (text) {
    await sendMessage(text, preferences.userID, preferences.botToken);
  }
  await showHUD("ok");
}
