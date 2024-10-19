import { Clipboard, closeMainWindow, showHUD, getPreferenceValues } from "@raycast/api";
import { getMessages } from "./messages";
import { Preferences } from "./types";
import { extractCode } from "./utils";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const messages = await getMessages({ searchType: "code", searchText: "" });

  if (messages && Array.isArray(messages)) {
    const latestMessage = messages[0];

    const code = extractCode(latestMessage?.text ?? "");

    if (code) {
      await Clipboard.copy(code);
      showHUD(
        preferences.showCodeInHUD
          ? `✅ ${code} copied to clipboard.`
          : `✅ Code (received at ${latestMessage.message_date}) copied to clipboard.`
      );
    } else {
      showHUD(`❌ No recent 2FA code found.`);
    }
  }

  await closeMainWindow();
}
