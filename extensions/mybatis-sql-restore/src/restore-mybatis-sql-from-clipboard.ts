import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { formatSql, parseMybatisLog } from "./utils";
import { MESSAGES } from "./constants/messages";

export default async function restoreMybatisSqlFromClipboard() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD(MESSAGES.ERROR.NO_CLIPBOARD_TEXT);
      return;
    }

    const { sql, params } = parseMybatisLog(clipboardText);

    if (!sql) {
      await showHUD(MESSAGES.ERROR.NO_VALID_SQL);
      return;
    }

    const formattedSql = formatSql(sql, params);
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
