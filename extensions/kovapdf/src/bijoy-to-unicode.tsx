import {
  Clipboard,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { ATTRIBUTION, bijoyToUnicode } from "./lib/logic";
import { client, showError } from "./lib/raycast";

/** The app in front, or undefined when Raycast cannot tell. */
async function frontmostBundle(): Promise<string | undefined> {
  try {
    return (await getFrontmostApplication()).bundleId;
  } catch {
    return undefined;
  }
}

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Converting with KovaPDF" });
  try {
    const sourceApp = await frontmostBundle();
    const selected = await getSelectedText().catch(() => "");
    const text = await bijoyToUnicode(client(), selected);
    const { output } = getPreferenceValues<Preferences.BijoyToUnicode>();
    // Paste only into the app the text came from. If the person switched apps
    // while the conversion ran (or Raycast cannot tell), copy instead.
    const sameApp = sourceApp !== undefined && (await frontmostBundle()) === sourceApp;
    if (output !== "copy" && sameApp) {
      await Clipboard.paste(text);
      await toast.hide();
      await showHUD(`Pasted Unicode text. ${ATTRIBUTION}`);
    } else {
      await Clipboard.copy(text);
      await toast.hide();
      await showHUD(
        output === "copy"
          ? `Copied Unicode text. ${ATTRIBUTION}`
          : `You switched apps, so the Unicode text was copied instead of pasted. ${ATTRIBUTION}`,
      );
    }
  } catch (err) {
    await showError(err, toast);
  }
}
