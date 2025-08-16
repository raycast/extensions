import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { dump } from "js-yaml";
import { Project, WarpTemplate, WarpLaunchConfig, TerminalCommand } from "../types";

const execAsync = promisify(exec);

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
 * 将配置写入Warp配置目录并返回路径
 */
async function writeConfigToWarpDir(config: WarpLaunchConfig): Promise<string> {
  const warpConfigDir = getWarpConfigDir();

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

  const configPath = join(warpConfigDir, `${safeFileName}_${Date.now()}.yaml`);

  const yamlContent = dump(config, { noRefs: true });

  console.log("生成的YAML配置:");
  console.log(yamlContent);
  console.log("配置文件将写入:", configPath);

  await writeFile(configPath, yamlContent, "utf-8");

  // 验证文件是否正确写入
  const writtenContent = await import("fs/promises").then((fs) => fs.readFile(configPath, "utf-8"));
  console.log("已写入的文件内容:");
  console.log(writtenContent);

  return configPath;
}

/**
 * 启动Warp配置
 */
export async function launchWarpConfig(project: Project, template: WarpTemplate): Promise<void> {
  try {
    console.log("启动Warp配置:", {
      project: project.name,
      template: template.name,
      mode: template.launchMode,
      commands: template.commands,
    });

    const config = generateWarpConfig(project, template);

    console.log("生成的配置对象:", config);

    const configPath = await writeConfigToWarpDir(config);
    console.log(`✅ 配置文件写入成功: ${configPath}`);

    // 验证文件确实存在
    try {
      const fs = await import("fs/promises");
      const stats = await fs.stat(configPath);
      console.log(`✅ 文件验证成功，大小: ${stats.size} bytes`);
    } catch (error) {
      console.error(`❌ 文件验证失败:`, error);
      throw new Error(`配置文件不存在: ${configPath}`);
    }

    // 使用Warp的URI scheme打开配置 - 使用配置名称而不是文件路径
    const warpUrl = `warp://launch/${encodeURIComponent(config.name)}`;
    console.log("🚀 准备启动Warp...");
    console.log("Warp URL:", warpUrl);
    console.log("配置名称:", config.name);

    try {
      console.log("📋 尝试方法1 - URL Scheme:", `open '${warpUrl}'`);
      const result1 = await execAsync(`open '${warpUrl}'`);
      console.log("✅ URL Scheme命令执行成功");
      console.log("命令输出:", result1.stdout || "无输出");
      if (result1.stderr) {
        console.log("命令错误:", result1.stderr);
      }

      // 等待一下看Warp是否启动
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 检查Warp是否在运行
      try {
        const psResult = await execAsync("pgrep -x Warp");
        if (psResult.stdout.trim()) {
          console.log("✅ Warp进程已检测到，URL Scheme方法成功");
          return;
        }
      } catch {
        console.log("⚠️ Warp进程未检测到，尝试备用方法...");
      }

      // 备用方法1：直接启动Warp应用
      console.log("📋 尝试方法2 - 直接启动Warp:");
      await execAsync("open -a Warp");
      console.log("✅ Warp应用启动命令执行");

      // 等待Warp启动
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 备用方法2：使用warp命令行工具（如果存在）
      try {
        console.log("📋 尝试方法3 - 检查warp CLI:");
        const warpCliResult = await execAsync("which warp");
        if (warpCliResult.stdout.trim()) {
          console.log("✅ 找到warp CLI，尝试直接启动配置");
          await execAsync(`warp launch "${config.name}"`);
          console.log("✅ warp CLI启动成功");
          return;
        }
      } catch {
        console.log("❌ warp CLI不可用");
      }
    } catch (error) {
      console.error("❌ 所有启动方法都失败:", error);
      throw error;
    }

    console.log(`📁 配置文件已保存到: ${configPath}`);
    console.log("💡 手动启动配置的方法:");
    console.log("  1. 打开Warp终端");
    console.log("  2. 按 Cmd+P 打开Command Palette");
    console.log(`  3. 搜索 "${config.name}"`);
    console.log("  4. 选择对应的配置启动");
    console.log("");
    console.log("🔍 或者尝试以下方法:");
    console.log("  1. 直接执行:", `open '${warpUrl}'`);
    console.log("  2. 在Warp中打开配置文件:", configPath);

    // 不再删除配置文件，让用户可以重复使用
    // 如果需要清理，可以定期清理旧的配置文件
  } catch (error) {
    console.error("启动Warp失败:", error);
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
  console.log("🔍 开始Warp环境诊断...");

  // 1. 检查Warp是否安装
  try {
    const result = await execAsync("which warp");
    console.log("✅ Warp CLI 路径:", result.stdout.trim());
  } catch {
    console.log("❌ Warp CLI 未找到");
  }

  // 2. 检查Warp应用是否安装
  try {
    await execAsync("ls -la /Applications/Warp.app");
    console.log("✅ Warp.app 已安装");
  } catch {
    console.log("❌ Warp.app 未在 /Applications 目录中找到");
  }

  // 3. 检查配置目录
  const configDir = getWarpConfigDir();
  try {
    const fs = await import("fs/promises");
    await fs.stat(configDir);
    console.log(`✅ 配置目录存在: ${configDir}`);

    // 列出现有配置文件
    const files = await fs.readdir(configDir);
    console.log(`📁 配置文件数量: ${files.length}`);
    files.forEach((file) => console.log(`  - ${file}`));
  } catch (error) {
    console.log(`❌ 配置目录问题: ${configDir}`, error);
  }

  // 4. 测试简单的URI启动
  try {
    console.log("🧪 测试基本URI启动...");
    await execAsync('open "warp://action/new_window"');
    console.log("✅ 基本URI启动成功");
  } catch (error) {
    console.log("❌ 基本URI启动失败:", error);
  }

  console.log("🔍 Warp环境诊断完成");
}
