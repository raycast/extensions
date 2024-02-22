import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { Preferences } from "../types/preferences";

export async function getAppendedText(append = true) {
  const {
    appendSeparator,
    prependSeparator,
    trimBeforeAppendClipboardText,
    trimBeforeAppendSelectedText,
    trimAfterAppend,
  } = getPreferenceValues<Preferences>();
  await closeMainWindow({ clearRootSearch: false });
  try {
    let appendText = await getSelectedText();

    // selected text
    if (trimBeforeAppendSelectedText) {
      appendText = appendText.trim();
    }

    // clipboard text
    let clipBoardText = await Clipboard.readText();
    if (typeof clipBoardText !== "string") {
      clipBoardText = "";
    }
    if (trimBeforeAppendClipboardText) {
      clipBoardText = clipBoardText.trim();
    }

    // appended text
    let finalText: string;
    if (append) {
      switch (appendSeparator) {
        case "{newline}":
          finalText = `${clipBoardText}\n${appendText}`;
          break;
        case "{tab}":
          finalText = `${clipBoardText}\t${appendText}`;
          break;
        default:
          finalText = clipBoardText + appendSeparator + appendText;
      }
      await showHUD(`✅ Appended text to clipboard`);
    } else {
      switch (prependSeparator) {
        case "{newline}":
          finalText = `${appendText}\n${clipBoardText}`;
          break;
        case "{tab}":
          finalText = `${appendText}\t${clipBoardText}`;
          break;
        default:
          finalText = appendText + prependSeparator + clipBoardText;
      }
      await showHUD(`✅ Prepended text to clipboard`);
    }
    if (trimAfterAppend) {
      finalText = finalText.trim();
    }
    await Clipboard.copy(finalText);
  } catch (e) {
    await showHUD(`🚫 Cannot copy selected text from front-most application`);
  }
}
