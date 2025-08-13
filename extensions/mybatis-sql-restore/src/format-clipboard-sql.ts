import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { formatRawSql } from "./utils";
import { MESSAGES } from "./constants/messages";

export default async function formatClipboardSql() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      return;
    }

    if (!clipboardText.trim()) {
      await showHUD(MESSAGES.ERROR.EMPTY_INPUT);
      return;
    }

    const formattedSql = formatRawSql(clipboardText);
    await Clipboard.copy(formattedSql);

    // Show success message and auto-exit
    await showHUD(MESSAGES.SUCCESS.SQL_FORMATTED);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: MESSAGES.ERROR.GENERAL_ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
