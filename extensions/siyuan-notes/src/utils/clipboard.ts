import { Clipboard, showToast, Toast } from "@raycast/api";

export async function copyToClipboard(
  text: string,
  message?: string,
): Promise<void> {
  try {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: message || "已复制到剪贴板",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "复制失败",
      message: error instanceof Error ? error.message : "未知错误",
    });
  }
}

export async function pasteFromClipboard(): Promise<string> {
  try {
    const { text } = await Clipboard.read();
    return text || "";
  } catch (error) {
    console.error("读取剪贴板失败:", error);
    return "";
  }
}
