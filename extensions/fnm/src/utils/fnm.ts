import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execAsync = promisify(exec);

interface Preferences {
  fnmPath?: string;
  customPaths?: string;
}

// 获取用户配置
function getPreferences(): Preferences {
  try {
    return getPreferenceValues<Preferences>();
  } catch {
    return {};
  }
}

// 获取 fnm 命令,优先使用用户配置的路径
function getFnmCommand(): string {
  const preferences = getPreferences();

  // 如果用户配置了自定义路径,使用自定义路径
  if (preferences.fnmPath && preferences.fnmPath.trim()) {
    return preferences.fnmPath.trim();
  }

  // 否则使用默认的 fnm 命令
  return "fnm";
}

// 获取正确的 PATH,包含常见的包管理器路径和用户自定义路径
function getEnvWithPath() {
  const preferences = getPreferences();

  const paths = [
    "/opt/homebrew/bin", // Homebrew (Apple Silicon)
    "/usr/local/bin", // Homebrew (Intel)
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];

  // 添加用户自定义的额外路径
  if (preferences.customPaths && preferences.customPaths.trim()) {
    const customPaths = preferences.customPaths.split(":").filter(Boolean);
    paths.unshift(...customPaths);
  }

  // 添加系统 PATH
  if (process.env.PATH) {
    paths.push(process.env.PATH);
  }

  return {
    ...process.env,
    PATH: paths.filter(Boolean).join(":"),
  };
}

// 执行命令时使用正确的环境变量
async function execWithEnv(command: string) {
  return execAsync(command, { env: getEnvWithPath() });
}

export interface NodeVersion {
  version: string;
  isDefault: boolean;
  isCurrent: boolean;
  isLts: boolean;
}

/**
 * Check if fnm is installed
 */
export async function checkFnmInstalled(): Promise<boolean> {
  try {
    const fnmCmd = getFnmCommand();

    // 如果用户配置了完整路径,直接检查文件是否存在
    if (fnmCmd.includes("/")) {
      const { existsSync } = await import("fs");
      return existsSync(fnmCmd);
    }

    // 否则使用 which 命令查找
    await execWithEnv(`which ${fnmCmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the configured fnm path for display
 */
export function getFnmPath(): string {
  return getFnmCommand();
}

/**
 * Get all installed Node.js versions
 */
export async function getInstalledVersions(): Promise<NodeVersion[]> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout } = await execWithEnv(`${fnmCmd} list`);
    const lines = stdout.trim().split("\n");
    const versions: NodeVersion[] = [];

    // 获取当前使用的版本
    let currentVersion: string | null = null;
    try {
      const { stdout: currentStdout } = await execWithEnv(`${fnmCmd} current`);
      const currentMatch = currentStdout.match(/v?(\d+\.\d+\.\d+)/);
      if (currentMatch) {
        currentVersion = currentMatch[1];
      }
    } catch {
      // 如果获取当前版本失败,忽略错误
    }

    for (const line of lines) {
      if (!line.trim() || line.includes("system")) continue;

      const isDefault = line.includes("default");
      const isLts = line.includes("lts");

      // Extract version number (e.g., "v18.17.0" or "18.17.0")
      const versionMatch = line.match(/v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        versions.push({
          version,
          isDefault,
          isCurrent: version === currentVersion,
          isLts,
        });
      }
    }

    // 按版本号倒序排列(最新版本在前)
    versions.sort((a, b) => {
      const [aMajor, aMinor, aPatch] = a.version.split(".").map(Number);
      const [bMajor, bMinor, bPatch] = b.version.split(".").map(Number);

      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });

    return versions;
  } catch (error) {
    console.error("Error getting installed versions:", error);
    return [];
  }
}

/**
 * Get current Node.js version
 */
export async function getCurrentVersion(): Promise<string | null> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout } = await execWithEnv(`${fnmCmd} current`);
    const versionMatch = stdout.match(/v?(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Install a Node.js version
 */
export async function installVersion(version: string): Promise<{ success: boolean; message: string }> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout, stderr } = await execWithEnv(`${fnmCmd} install ${version}`);
    return {
      success: true,
      message: stdout || stderr || `Successfully installed Node.js ${version}`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: errorMessage || `Failed to install Node.js ${version}`,
    };
  }
}

/**
 * Use a specific Node.js version
 * Note: fnm use requires shell integration, so we set it as default instead
 */
export async function useVersion(version: string): Promise<{ success: boolean; message: string }> {
  try {
    const fnmCmd = getFnmCommand();
    // 使用 fnm default 而不是 fnm use,因为 use 需要 shell 集成
    await execWithEnv(`${fnmCmd} default ${version}`);
    return {
      success: true,
      message: `已将 Node.js ${version} 设置为默认版本\n新打开的终端将使用此版本`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: errorMessage || `切换到 Node.js ${version} 失败`,
    };
  }
}

/**
 * Set default Node.js version
 */
export async function setDefaultVersion(version: string): Promise<{ success: boolean; message: string }> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout, stderr } = await execWithEnv(`${fnmCmd} default ${version}`);
    return {
      success: true,
      message: stdout || stderr || `Set Node.js ${version} as default`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: errorMessage || `Failed to set Node.js ${version} as default`,
    };
  }
}

/**
 * Uninstall a Node.js version
 */
export async function uninstallVersion(version: string): Promise<{ success: boolean; message: string }> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout, stderr } = await execWithEnv(`${fnmCmd} uninstall ${version}`);
    return {
      success: true,
      message: stdout || stderr || `Successfully uninstalled Node.js ${version}`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: errorMessage || `Failed to uninstall Node.js ${version}`,
    };
  }
}

export interface RemoteVersion {
  version: string;
  isLts: boolean;
}

/**
 * Get available remote versions
 */
export async function getRemoteVersions(): Promise<RemoteVersion[]> {
  try {
    const fnmCmd = getFnmCommand();
    const { stdout } = await execWithEnv(`${fnmCmd} list-remote`);
    const lines = stdout.trim().split("\n");
    const versions: RemoteVersion[] = [];

    for (const line of lines) {
      const isLts = line.toLowerCase().includes("lts");
      const versionMatch = line.match(/v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        versions.push({
          version: versionMatch[1],
          isLts,
        });
      }
    }

    // 按版本号倒序排列(最新版本在前)
    versions.sort((a, b) => {
      const [aMajor, aMinor, aPatch] = a.version.split(".").map(Number);
      const [bMajor, bMinor, bPatch] = b.version.split(".").map(Number);

      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });

    return versions;
  } catch (error) {
    console.error("Error getting remote versions:", error);
    return [];
  }
}
