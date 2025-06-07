import { showToast, Toast, Clipboard } from "@raycast/api";

export default async function Command() {
  try {
    // 获取剪贴板内容
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent || !clipboardContent.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "剪贴板为空",
        message: "请先复制一些文本",
      });
      return;
    }

    // 处理文本：在英文单词之间保留一个空格，删除中文字符之间的空格
    const processedText = clipboardContent
      // 首先将连续的多个空格替换为单个空格
      .replace(/\s+/g, " ")
      // 删除中文字符之间的空格
      .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
      // 删除行首和行尾的空格
      .trim();

    // 将处理后的文本放回剪贴板
    await Clipboard.copy(processedText);

    await showToast({
      style: Toast.Style.Success,
      title: "空格已处理",
      message: "处理后的文本已复制到剪贴板",
    });
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "操作失败",
      message: error instanceof Error ? error.message : "未知错误",
    });
  }
}
