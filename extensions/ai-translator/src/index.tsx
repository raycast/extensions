import { AI, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// ===== 在这里修改AI提示词 =====
// 您可以根据需要修改这个提示词，例如：
// - 翻译：将以下文本翻译成英文，保持原始格式
// - 总结：总结以下文本的主要内容和关键点
// - 改写：改写以下文本，使其更加清晰和专业
// - 解释代码：解释以下代码的功能和工作原理
const AI_PROMPT = `将以下文本翻译成英文，保持原始格式：

{text}`;

// 处理模式的显示名称（用于显示在HUD中）
const PROCESSING_MODE = "翻译";

export default async function Command() {
  try {
    // 保存当前剪贴板内容
    const previousClipboard = await Clipboard.read();

    // 模拟复制操作（假设文本已经被选中）
    await execPromise('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 获取选中的文本
    const selectedText = await Clipboard.read();

    if (!selectedText.text || selectedText.text.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "未选中文本",
        message: "请先选中要处理的文本",
      });
      await Clipboard.paste(previousClipboard);
      return;
    }

    // 显示处理中提示
    await showHUD(`正在${PROCESSING_MODE}...`);

    // 准备AI提示词
    const prompt = AI_PROMPT.replace("{text}", selectedText.text);

    // 调用AI API
    const processedText = await AI.ask(prompt);

    // 将处理后的文本复制到剪贴板
    await Clipboard.copy(processedText);

    // 模拟粘贴
    await execPromise('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');

    // 显示成功提示
    await showHUD(`${PROCESSING_MODE}完成`);

    // 延迟后恢复原始剪贴板内容
    setTimeout(async () => {
      await Clipboard.paste(previousClipboard);
    }, 800);
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `${PROCESSING_MODE}失败`,
      message: String(error),
    });
  }
}
