import { open, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 获取应用路径
 */
async function getAppPath(): Promise<string | null> {
  try {
    // 尝试查找 ToolsHunt 应用
    const { stdout } = await execAsync(
      'mdfind "kMDItemKind == Application && kMDItemDisplayName == ToolsHunt"',
    );
    const apps = stdout
      .trim()
      .split("\n")
      .filter((path) => path.endsWith(".app"));

    if (apps.length > 0) {
      return apps[0];
    }

    // 如果找不到，尝试常见的安装路径
    const commonPaths = [
      "/Applications/ToolsHunt.app",
      `${process.env.HOME}/Applications/ToolsHunt.app`,
    ];

    for (const path of commonPaths) {
      try {
        await execAsync(`test -d "${path}"`);
        return path;
      } catch {
        // 继续尝试下一个路径
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding app:", error);
    return null;
  }
}

/**
 * 打开工具
 */
export async function openTool(toolId: string) {
  try {
    const appPath = await getAppPath();

    if (!appPath) {
      await showHUD("❌ ToolsHunt app not found. Please install it first.");
      return;
    }

    // 构建深链接 URL
    // 应用支持自定义 URL scheme: toolshunt://tool/{toolId}
    const deepLink = `toolshunt://tool/${toolId}`;

    // 先打开应用
    await execAsync(`open -a "${appPath}"`);

    // 等待应用启动
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 尝试使用深链接打开特定工具
    try {
      await open(deepLink);
      await showHUD(`✅ Opening ${toolId}`);
    } catch {
      // 如果深链接不支持，直接打开应用
      await showHUD(`✅ ToolsHunt opened`);
    }
  } catch (error) {
    console.error("Error opening tool:", error);
    await showHUD(`❌ Failed to open tool: ${error}`);
  }
}

/**
 * 检查应用是否已安装
 */
export async function isAppInstalled(): Promise<boolean> {
  const appPath = await getAppPath();
  return appPath !== null;
}
