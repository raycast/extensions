import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { generatePassword, getDefaultPasswordOptions } from "./utils/password-generator";

export default async function GeneratePasswordQuick() {
  try {
    const prefs = getPreferenceValues<Preferences.GeneratePasswordQuick>();
    const options = getDefaultPasswordOptions();
    const password = generatePassword(options);

    switch (prefs.quickAction || "copyAndPaste") {
      case "copy":
        await Clipboard.copy(password);
        await showHUD("✅ Password copied to clipboard");
        break;
      case "paste":
        await Clipboard.paste(password);
        await showHUD("✅ Password pasted");
        break;
      case "copyAndPaste":
        await Clipboard.copy(password);
        await Clipboard.paste(password);
        await showHUD("✅ Password copied and pasted");
        break;
    }
  } catch {
    await showHUD("❌ Failed to generate password");
  }
}
