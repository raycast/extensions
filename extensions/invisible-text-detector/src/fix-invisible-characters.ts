import * as Ray from "@raycast/api";
import { analyzeText } from "./lib/analyze";
import { fixAllUnicode, fixInvisibleOnly, getPreferences, readPreferredTextSource } from "./lib/runtime";

export default async function main() {
  const prefs = getPreferences();
  try {
    const original = await readPreferredTextSource(prefs);
    if (!original) {
      await Ray.showToast({
        style: Ray.Toast.Style.Failure,
        title: "No text to process",
        message: "Select text or copy it to the clipboard",
      });
      return;
    }

    const analysisBefore = analyzeText(original);
    const cleaned = prefs.defaultCleanMode === "all" ? fixAllUnicode(original, prefs) : fixInvisibleOnly(original);
    const analysisAfter = analyzeText(cleaned);

    if (prefs.actionAfterClean === "paste") {
      await Ray.closeMainWindow();
      await Ray.Clipboard.paste(cleaned);
    } else {
      await Ray.Clipboard.copy(cleaned);
    }

    if (prefs.showToasts) {
      const modeLabel = prefs.defaultCleanMode === "all" ? "All Unicode" : "Only Invisible";
      await Ray.showToast({
        style: Ray.Toast.Style.Success,
        title: `Cleaned text (${modeLabel})`,
        message: `before: ${analysisBefore.invisible.count} invisible, ${analysisBefore.nonKeyboard.count} non-keyboard → after: ${analysisAfter.invisible.count} invisible, ${analysisAfter.nonKeyboard.count} non-keyboard`,
      });
    }
  } catch (error) {
    await Ray.showToast({ style: Ray.Toast.Style.Failure, title: "Failed to clean", message: String(error) });
  }
}
