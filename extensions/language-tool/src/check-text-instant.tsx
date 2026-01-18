import {
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { applyAllCorrections } from "./utils/text-correction";
import { checkTextWithAPI } from "./services/languagetool-api";
import { showFailureToast } from "@raycast/utils";
import { filterValidMatches } from "./utils/match-filter";

/**
 * Command that reads text from clipboard, checks it, and pastes the corrected result
 * Runs instantly without UI
 */
export default async function Command() {
  try {
    // Read text from selected text or clipboard
    const text =
      (await getSelectedText()).trim() || (await Clipboard.readText());

    if (!text || text.trim().length === 0) {
      await showToast({
        title: "No text found",
        message: "Please copy some text to check",
        style: Toast.Style.Failure,
      });
      return;
    }

    // Show loading
    await showToast({
      title: "Checking text...",
      style: Toast.Style.Animated,
    });

    // Get global preferences
    const preferences = getPreferenceValues<Preferences>();

    // Use centralized service (includes Premium credentials automatically)
    const result = await checkTextWithAPI({
      text: text,
      language: "auto",
      level: preferences.level,
      disabledRules: preferences.disabledRules,
      enableHiddenRules: preferences.enableHiddenRules,
      noopLanguages: preferences.noopLanguages,
      abtest: preferences.abtest,
      mode: preferences.mode,
      allowIncompleteResults: preferences.allowIncompleteResults,
      useragent: preferences.useragent,
    });

    // Filter out matches with invalid replacements (empty or only whitespace/newlines)
    const filteredResult = filterValidMatches(result);

    // Apply all corrections using pure utility function
    const correctedText = applyAllCorrections(text, filteredResult);

    // Paste the corrected text
    await Clipboard.paste(correctedText);

    // Feedback
    const matchesCount = filteredResult.matches?.length || 0;
    await showToast({
      title:
        matchesCount > 0 ? `Fixed ${matchesCount} issues` : "No issues found",
      message: "Corrected text pasted",
      style: Toast.Style.Success,
    });

    // Close Raycast window
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Error checking text" });
  }
}
