import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { formatRawSql } from "./utils";

export default async function command() {
  try {
    // 获取剪贴板内容
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("剪贴板中没有文本内容");
      return;
    }

    // 格式化SQL
    const formattedSql = formatRawSql(clipboardText);

    // 复制到剪贴板
    await Clipboard.copy(formattedSql);

    // 展示格式化后的SQL
    await showToast({
      style: Toast.Style.Success,
      title: "SQL已格式化并复制到剪贴板",
      message: formattedSql,
      primaryAction: {
        title: "再次复制",
        onAction: () => {
          Clipboard.copy(formattedSql);
        },
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "发生错误",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
