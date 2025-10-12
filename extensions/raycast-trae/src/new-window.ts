import {
  closeMainWindow,
  getApplications,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { TRAE_COMMON_PATHS, validateTraePath } from "./utils";

const execAsync = promisify(exec);

interface Preferences {
  traePath?: string;
}

// 缓存 Trae 路径，避免重复查找
let cachedTraePath: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 并行检查多个路径是否存在
 */
async function checkPathsInParallel(paths: string[]): Promise<string | null> {
  const results = await Promise.allSettled(
    paths.map(
      (path) =>
        new Promise<string | null>((resolve) => {
          existsSync(path) ? resolve(path) : resolve(null);
        }),
    ),
  );

  const validPath = results.find(
    (result) => result.status === "fulfilled" && result.value !== null,
  );

  return validPath?.status === "fulfilled" ? validPath.value : null;
}

/**
 * Get Trae application path from preferences or common locations
 */
async function getTraePath(): Promise<string> {
  // 检查缓存是否有效
  if (cachedTraePath && validateTraePath(cachedTraePath)) {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION) {
      return cachedTraePath;
    }
  }

  // 1. 检查已安装的应用程序（优化：只检查一次）
  const applications = await getApplications();
  const traeApplication = applications.find((app) => {
    return (
      app.name.toLowerCase().includes("trae") ||
      app.name.toLowerCase().includes("trae cn")
    );
  });

  if (traeApplication && traeApplication.path) {
    // 从 .app 包中找到可执行文件（并行检查）
    const appPath = traeApplication.path;
    const possibleExecutablePaths = [
      `${appPath}/Contents/MacOS/Electron`,
      `${appPath}/Contents/MacOS/Trae`,
      `${appPath}/Contents/MacOS/Trae CN`,
    ];

    const foundPath = await checkPathsInParallel(possibleExecutablePaths);
    if (foundPath) {
      cachedTraePath = foundPath;
      cacheTimestamp = Date.now();
      return foundPath;
    }
  }

  // 2. 检查偏好设置中的路径
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.traePath && validateTraePath(preferences.traePath)) {
    cachedTraePath = preferences.traePath;
    cacheTimestamp = Date.now();
    return preferences.traePath;
  }

  // 3. 并行检查常见路径
  const foundCommonPath = await checkPathsInParallel([...TRAE_COMMON_PATHS]);
  if (foundCommonPath) {
    cachedTraePath = foundCommonPath;
    cacheTimestamp = Date.now();
    return foundCommonPath;
  }

  throw new Error(
    "Trae application not found. Please install Trae or configure the path in extension preferences.",
  );
}

/**
 * New Window command: Create a new Trae window via menu command
 */
export default async function main(): Promise<void> {
  try {
    await closeMainWindow();

    const traePath = await getTraePath();

    // 优化：优先使用命令行参数，更快更可靠
    try {
      await execAsync(`"${traePath}" --new-window`);
    } catch (commandError) {
      // 只有命令行参数失败时才用 AppleScript
      console.log("Command line failed, trying AppleScript:", commandError);

      const appleScript = `
        tell application "System Events"
          tell process "Trae"
            click menu item "新建窗口" of menu "文件" of menu bar 1
          end tell
        end tell
      `;

      try {
        await execAsync(`osascript -e '${appleScript}'`);
      } catch (menuError) {
        // 如果都失败了，尝试直接打开应用
        await execAsync(`open -a "${traePath}"`);
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
