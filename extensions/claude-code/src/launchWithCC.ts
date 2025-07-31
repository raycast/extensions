import { getSelectedFinderItems, showToast, Toast, Clipboard } from "@raycast/api";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";

interface FileSystemItem {
  path: string;
}

/**
 * 智能选择最适合的项目
 * 优先级: 目录 > 文件
 * 如果多个文件在同一目录，选择父目录
 */
function selectBestItem(items: FileSystemItem[]): FileSystemItem {
  if (items.length === 0) {
    throw new Error("No items selected");
  }

  if (items.length === 1) {
    return items[0];
  }

  // 分离目录和文件
  const directories = items.filter((item) => !item.path.split("/").pop()?.includes("."));
  const files = items.filter((item) => item.path.split("/").pop()?.includes("."));

  // 优先返回目录
  if (directories.length > 0) {
    return directories[0];
  }

  // 检查是否所有文件都在同一目录
  if (files.length > 1) {
    const firstFileDir = files[0].path.split("/").slice(0, -1).join("/");
    const allInSameDir = files.every((file) => file.path.split("/").slice(0, -1).join("/") === firstFileDir);

    if (allInSameDir) {
      // 返回父目录
      return { path: firstFileDir };
    }
  }

  // 默认返回第一个文件
  return files[0];
}

/**
 * 构建 Claude Code 命令
 */
function buildClaudeCommand(item: FileSystemItem): { command: string; targetDir: string; fileName: string } {
  const fileName = item.path.split("/").pop() || item.path;
  const isFile = fileName.includes(".");

  // 确定目标目录
  const targetDir = isFile ? item.path.split("/").slice(0, -1).join("/") : item.path;

  // 构建命令
  const command = `cd "${targetDir}" && claude --add-dir "${item.path}"`;

  return { command, targetDir, fileName };
}

/**
 * 主函数 - no-view 模式入口
 */
export default async function main() {
  try {
    // 显示启动提示
    await showToast({
      style: Toast.Style.Animated,
      title: "Launching Claude Code...",
      message: "Getting Finder selection",
    });

    // 1. 获取 Finder 选中项
    let items: FileSystemItem[];
    try {
      items = await getSelectedFinderItems();
    } catch {
      throw new Error(
        "Please select a file or directory in Finder first. Make sure Finder is the frontmost application.",
      );
    }

    if (items.length === 0) {
      throw new Error("No items selected in Finder. Please select a file or directory first.");
    }

    // 2. 智能选择最适合的项目
    const targetItem = selectBestItem(items);

    // 3. 构建命令
    const { command, fileName } = buildClaudeCommand(targetItem);

    // 4. 执行命令
    await showToast({
      style: Toast.Style.Animated,
      title: "Launching Claude Code",
      message: `Opening ${fileName}...`,
    });

    const result = await executeInTerminal(command);

    // 5. 处理结果
    if (result.success) {
      await showTerminalSuccessToast(result.terminalUsed, fileName);
    } else {
      // 复制手动命令到剪贴板
      const manualCommand = getManualCommand(command);
      await Clipboard.copy(manualCommand);

      await showTerminalErrorToast(manualCommand, fileName);

      await showToast({
        style: Toast.Style.Failure,
        title: "Launch Failed",
        message: "Check if Claude Code is installed. Command copied to clipboard.",
      });
    }
  } catch (error) {
    console.error("Error in launchWithCC:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Claude Code",
      message: errorMessage,
    });

    // 如果是选择相关的错误，提供使用指导
    if (errorMessage.includes("Finder") || errorMessage.includes("select")) {
      setTimeout(async () => {
        await showToast({
          style: Toast.Style.Success,
          title: "How to Use",
          message: "1. Select file/folder in Finder 2. Run this command",
        });
      }, 2000);
    }
  }
}
