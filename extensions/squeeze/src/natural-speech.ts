import { Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.NaturalSpeech>();

  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    // Remove hyphen + line breaks (e.g., "-\n")
    let processed = text.replace(/-\n/g, "");

    if (preferences.preserveParagraphs) {
      // Replace multiple line breaks with two \n, single line breaks with space
      processed = processed.replace(/\n{1,}/g, (match) => (match.length >= 2 ? "\n\n" : " "));
    } else {
      // Replace all line breaks with space
      processed = processed.replace(/\n+/g, " ");
    }

    // Normalize multiple spaces/tabs/etc into a single space
    processed = processed.replace(/[ \t\r\f\v]+/g, " ");

    // Trim leading and trailing whitespace
    processed = processed.trim();

    await Clipboard.copy(processed);

    await showToast({
      style: Toast.Style.Success,
      title: "Clipboard text converted to natural speech",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to process clipboard" });
  }
}
