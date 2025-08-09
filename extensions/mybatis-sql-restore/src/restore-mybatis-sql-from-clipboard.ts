import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { formatSql, parseMybatisLog } from "./utils";

export default async function sqlFormatFromClipboard() {
  try {
    // 从剪贴板获取文本，而不是获取选中的文本
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("剪贴板中没有文本内容");
      return;
    }

    // 解析SQL和参数
    const { sql, params } = parseMybatisLog(clipboardText);

    if (!sql) {
      await showHUD("未找到有效的SQL语句，请确保剪贴板中包含完整的Mybatis日志");
      return;
    }

    // 替换参数并格式化SQL
    const formattedSql = formatSql(sql, params);

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
