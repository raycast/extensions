import { AI, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// ===== 在这里修改AI提示词 =====
const AI_PROMPT = `将以下文本翻译成英文，保持原始格式。如果文本是英文，则翻译成地道的中文：

{text}`;

// 处理模式的显示名称
const PROCESSING_MODE = "翻译";

// AI模型和创造力设置
const AI_MODEL = AI.Model.Anthropic_Claude_Sonnet; // 使用Claude 3.5 Sonnet模型
const AI_CREATIVITY = "low"; // 翻译任务通常需要较低的创造力

export default async function Command() {
  try {
    console.log("开始执行命令");

    // 保存当前剪贴板内容
    console.log("读取当前剪贴板内容");
    const previousClipboard = await Clipboard.read();
    console.log("剪贴板内容类型:", previousClipboard.type);
    console.log("剪贴板内容长度:", previousClipboard.text?.length || 0);

    // 模拟复制操作
    console.log("执行复制操作");
    try {
      await execPromise('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');
      console.log("复制操作执行完成");
    } catch (error) {
      console.error("复制操作失败:", error);
      throw new Error(`复制操作失败: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500)); // 增加延迟
    console.log("复制操作延迟完成");

    // 获取选中的文本
    console.log("获取剪贴板内容");
    const selectedText = await Clipboard.read();
    console.log("选中文本类型:", selectedText.type);
    console.log("选中文本长度:", selectedText.text?.length || 0);

    if (!selectedText.text || selectedText.text.trim() === "") {
      console.log("未选中文本，操作终止");
      await showToast({
        style: Toast.Style.Failure,
        title: "未选中文本",
        message: "请先选中要处理的文本",
      });
      console.log("恢复原始剪贴板");
      await Clipboard.paste(previousClipboard);
      return;
    }

    // 显示处理中提示
    console.log("显示处理中提示");
    await showHUD(`正在${PROCESSING_MODE}...`);

    // 准备AI提示词
    const prompt = AI_PROMPT.replace("{text}", selectedText.text);
    console.log("AI提示词长度:", prompt.length);
    console.log("使用模型:", AI_MODEL);
    console.log("创造力设置:", AI_CREATIVITY);

    // 调用AI API，指定使用Claude 3.5 Sonnet模型和创造力设置
    console.log("调用AI API");
    let processedText;
    try {
      processedText = await AI.ask(prompt, {
        model: AI_MODEL,
        creativity: AI_CREATIVITY,
      });
      console.log("AI API调用成功");
      console.log("处理结果长度:", processedText.length);
    } catch (error) {
      console.error("AI API调用失败:", error);
      throw new Error(`AI API调用失败: ${error.message}`);
    }

    // 将处理后的文本复制到剪贴板
    console.log("复制处理结果到剪贴板");
    await Clipboard.copy(processedText);

    // 模拟粘贴
    console.log("执行粘贴操作");
    try {
      await execPromise('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
      console.log("粘贴操作执行完成");
    } catch (error) {
      console.error("粘贴操作失败:", error);
      throw new Error(`粘贴操作失败: ${error.message}`);
    }

    // 显示成功提示
    console.log("显示完成提示");
    await showHUD(`${PROCESSING_MODE}完成`);

    // 延迟后恢复原始剪贴板内容
    console.log("设置定时器恢复原始剪贴板");
    setTimeout(async () => {
      try {
        console.log("恢复原始剪贴板");
        await Clipboard.paste(previousClipboard);
        console.log("剪贴板恢复完成");
      } catch (error) {
        console.error("剪贴板恢复失败:", error);
      }
    }, 1000);

    console.log("命令执行完成");
  } catch (error) {
    console.error("发生错误:", error);
    console.error("错误堆栈:", error.stack);

    await showToast({
      style: Toast.Style.Failure,
      title: `${PROCESSING_MODE}失败`,
      message: String(error),
    });
  }
}
