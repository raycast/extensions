import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { dump } from "js-yaml";
import { Project, WarpTemplate, WarpLaunchConfig, TerminalCommand } from "../types";
import { environment } from "@raycast/api";

const execAsync = promisify(exec);
const DEBUG = environment.isDevelopment;
const FILE_PREFIX = "code-runway__"; // only clean files we created

/**
 * 生成Warp启动配置
 */
export function generateWarpConfig(project: Project, template: WarpTemplate): WarpLaunchConfig {
  const { launchMode = "split-panes", splitDirection = "vertical" } = template;

  const config: WarpLaunchConfig = {
    name: `${project.name} - ${template.name}`,
    windows: [],
  };

  const createLayout = (command: TerminalCommand) => {
    const workingDir = command.workingDirectory ? join(project.path, command.workingDirectory) : project.path;
    return {
      cwd: workingDir,
      commands: [{ exec: command.command }],
    };
  };

  if (launchMode === "split-panes") {
    config.windows.push({
      tabs: [
        {
          title: `${project.name} - ${template.name}`,
          layout: {
            split_direction: splitDirection,
            panes: template.commands.map(createLayout),
          },
        },
      ],
    });
  } else if (launchMode === "multi-tab") {
    config.windows.push({
      tabs: template.commands.map((command) => ({
        title: command.title,
        layout: createLayout(command),
      })),
    });
  } else {
    // multi-window
    config.windows = template.commands.map((command) => ({
      tabs: [
        {
          title: command.title,
          layout: createLayout(command),
        },
      ],
    }));
  }

  return config;
}

/**
 * 获取Warp Launch Configuration目录路径
 */
function getWarpConfigDir(): string {
  const homeDir = homedir();
  return join(homeDir, ".warp", "launch_configurations");
}

/**
 * 清理旧的配置文件
 */
async function cleanOldConfigFiles(configName: string): Promise<void> {
  try {
    const warpConfigDir = getWarpConfigDir();
    const fs = await import("fs/promises");

    // 生成安全的文件名前缀
    const safeFileName = configName
      .replace(/[^a-zA-Z0-9\s\-_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    if (DEBUG) console.log(`Cleaning old config files with prefix: ${safeFileName}`);

    // 读取配置目录中的所有文件
    const files = await fs.readdir(warpConfigDir);

    // 找到所有匹配的旧配置文件
    const oldConfigFiles = files.filter(
      (file) => file.startsWith(`${FILE_PREFIX}${safeFileName}`) && file.endsWith(".yaml"),
    );

    if (oldConfigFiles.length > 0) {
      if (DEBUG) console.log(`Found ${oldConfigFiles.length} old config files to remove:`, oldConfigFiles);

      // 删除旧的配置文件
      for (const file of oldConfigFiles) {
        const filePath = join(warpConfigDir, file);
        await fs.unlink(filePath);
        if (DEBUG) console.log(`Removed: ${file}`);
      }
      if (DEBUG) console.log(`Cleaned up ${oldConfigFiles.length} old config files`);
    } else {
      if (DEBUG) console.log("No old config files found to clean");
    }
  } catch (error) {
    if (DEBUG) console.warn("Failed to clean old config files:", error);
    // Don't throw - this is not critical
  }
}

/**
 * 将配置写入Warp配置目录并返回路径
 */
async function writeConfigToWarpDir(config: WarpLaunchConfig): Promise<string> {
  const warpConfigDir = getWarpConfigDir();

  // 清理同名的旧配置文件
  await cleanOldConfigFiles(config.name);

  // 确保目录存在
  try {
    await mkdir(warpConfigDir, { recursive: true });
  } catch (error) {
    console.log("创建目录时出错（可能已存在）:", error);
  }

  // 生成安全的文件名（移除特殊字符）
  const safeFileName = config.name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const configPath = join(warpConfigDir, `${FILE_PREFIX}${safeFileName}_${Date.now()}.yaml`);

  const yamlContent = dump(config, { noRefs: true });

  if (DEBUG) {
    console.log("Generated YAML config:");
    console.log(yamlContent);
    console.log("Config will be written to:", configPath);
  }

  await writeFile(configPath, yamlContent, "utf-8");

  // 验证文件是否正确写入
  const writtenContent = await import("fs/promises").then((fs) => fs.readFile(configPath, "utf-8"));
  if (DEBUG) {
    console.log("Written file content:");
    console.log(writtenContent);
  }

  return configPath;
}

/**
 * 启动Warp配置
 */
export async function launchWarpConfig(project: Project, template: WarpTemplate): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching Warp config:", {
        project: project.name,
        template: template.name,
        mode: template.launchMode,
        commands: template.commands,
      });
    }

    const config = generateWarpConfig(project, template);

    if (DEBUG) console.log("Generated config object:", config);

    const configPath = await writeConfigToWarpDir(config);
    if (DEBUG) console.log(`Config file written: ${configPath}`);

    // 验证文件确实存在
    try {
      const fs = await import("fs/promises");
      const stats = await fs.stat(configPath);
      if (DEBUG) console.log(`File verification ok, size: ${stats.size} bytes`);
    } catch (error) {
      console.error(`File verification failed:`, error);
      throw new Error(`配置文件不存在: ${configPath}`);
    }

    // 使用Warp的URI scheme打开配置 - 使用配置名称而不是文件路径
    const warpUrl = `warp://launch/${encodeURIComponent(config.name)}`;
    if (DEBUG) {
      console.log("Preparing to launch Warp...");
      console.log("Warp URL:", warpUrl);
      console.log("Config name:", config.name);
    }

    try {
      if (DEBUG) console.log("Try method1 - URL Scheme:", `open '${warpUrl}'`);
      const result1 = await execAsync(`open '${warpUrl}'`);
      if (DEBUG) {
        console.log("URL Scheme executed");
        console.log("stdout:", result1.stdout || "<empty>");
        if (result1.stderr) console.log("stderr:", result1.stderr);
      }

      // 等待一下看Warp是否启动
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 检查Warp是否在运行
      try {
        const psResult = await execAsync("pgrep -x Warp");
        if (psResult.stdout.trim()) {
          if (DEBUG) console.log("Warp process detected; URL Scheme worked");
          return;
        }
      } catch {
        if (DEBUG) console.log("Warp process not detected; trying fallback...");
      }

      // 备用方法1：直接启动Warp应用
      if (DEBUG) console.log("Try method2 - open Warp app");
      await execAsync("open -a Warp");
      if (DEBUG) console.log("Warp app open command executed");

      // 等待Warp启动
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 备用方法2：使用warp命令行工具（如果存在）
      try {
        if (DEBUG) console.log("Try method3 - warp CLI check");
        const warpCliResult = await execAsync("which warp");
        if (warpCliResult.stdout.trim()) {
          if (DEBUG) console.log("warp CLI found, launching config");
          await execAsync(`warp launch "${config.name}"`);
          if (DEBUG) console.log("warp CLI launch success");
          return;
        }
      } catch {
        if (DEBUG) console.log("warp CLI not available");
      }
    } catch (error) {
      console.error("All launch methods failed:", error);
      throw error;
    }

    if (DEBUG) {
      console.log(`Config file saved at: ${configPath}`);
      console.log("Manual launch steps:");
      console.log("  1. Open Warp");
      console.log("  2. Cmd+P");
      console.log(`  3. Search "${config.name}"`);
      console.log("  4. Launch");
      console.log("Alternative:");
      console.log("  1. Run:", `open '${warpUrl}'`);
      console.log("  2. Open file in Warp:", configPath);
    }

    // 不再删除配置文件，让用户可以重复使用
    // 如果需要清理，可以定期清理旧的配置文件
  } catch (error) {
    console.error("Launch Warp failed:", error);
    throw new Error(`启动Warp失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 检查Warp是否已安装
 */
export async function checkWarpInstalled(): Promise<boolean> {
  try {
    await execAsync("which warp");
    return true;
  } catch {
    try {
      await execAsync("ls /Applications/Warp.app");
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 简单启动项目（直接在单个窗口中打开项目目录）
 */
export async function launchProjectSimple(project: Project): Promise<void> {
  try {
    const warpUrl = `warp://action/new_window?path=${encodeURIComponent(project.path)}`;
    await execAsync(`open "${warpUrl}"`);
  } catch (error) {
    throw new Error(`启动Warp失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试函数：创建一个简单的配置文件用于调试
 */
export async function createTestWarpConfig(): Promise<string> {
  const testConfig: WarpLaunchConfig = {
    name: "Test Configuration",
    windows: [
      {
        tabs: [
          {
            title: "Tab 1",
            layout: {
              cwd: homedir(),
              commands: [{ exec: "echo 'Hello from tab 1'" }],
            },
          },
          {
            title: "Tab 2",
            layout: {
              cwd: tmpdir(),
              commands: [{ exec: "echo 'Hello from tab 2'" }],
            },
          },
        ],
      },
    ],
  };

  return await writeConfigToWarpDir(testConfig);
}

/**
 * 调试函数：检查Warp配置和环境
 */
export async function debugWarpEnvironment(): Promise<void> {
  console.log("Start Warp environment diagnostics...");

  // 1. 检查Warp是否安装
  try {
    const result = await execAsync("which warp");
    console.log("Warp CLI path:", result.stdout.trim());
  } catch {
    console.log("Warp CLI not found");
  }

  // 2. 检查Warp应用是否安装
  try {
    await execAsync("ls -la /Applications/Warp.app");
    console.log("Warp.app installed");
  } catch {
    console.log("Warp.app not found in /Applications");
  }

  // 3. 检查配置目录
  const configDir = getWarpConfigDir();
  try {
    const fs = await import("fs/promises");
    await fs.stat(configDir);
    console.log(`Config dir exists: ${configDir}`);

    // 列出现有配置文件
    const files = await fs.readdir(configDir);
    console.log(`Config files: ${files.length}`);
    files.forEach((file) => console.log(`  - ${file}`));
  } catch (error) {
    console.log(`Config dir issue: ${configDir}`, error);
  }

  // 4. 测试简单的URI启动
  try {
    console.log("Test basic URI launch...");
    await execAsync('open "warp://action/new_window"');
    console.log("Basic URI launch success");
  } catch (error) {
    console.log("Basic URI launch failed:", error);
  }
  console.log("Warp environment diagnostics complete");
}
