import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { dump } from "js-yaml";
import { Project, WarpTemplate, WarpLaunchConfig, TerminalCommand } from "../types";
import { environment } from "@raycast/api";

const execFileAsync = promisify(execFile);
const DEBUG = environment.isDevelopment;
const FILE_PREFIX = "code-runway__"; // only clean files we created

/**
 * Builds a Warp launch configuration from a project template.
 */
export function generateWarpConfig(project: Project, template: WarpTemplate): WarpLaunchConfig {
  const { launchMode = "split-panes", splitDirection = "vertical" } = template;
  // Warp's split_direction semantics are the inverse of our UI labels (left/right vs up/down).
  const warpSplitDirection = splitDirection === "vertical" ? "horizontal" : "vertical";

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
            split_direction: warpSplitDirection,
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
 * Returns the Warp launch configuration directory.
 */
function getWarpConfigDir(): string {
  const homeDir = homedir();
  return join(homeDir, ".warp", "launch_configurations");
}

/**
 * Removes stale configuration files created by this extension.
 */
async function cleanOldConfigFiles(configName: string): Promise<void> {
  try {
    const warpConfigDir = getWarpConfigDir();
    const fs = await import("fs/promises");

    // Generate a stable, safe filename prefix.
    const safeFileName = configName
      .replace(/[^a-zA-Z0-9\s\-_]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    if (DEBUG) console.log(`Cleaning old config files with prefix: ${safeFileName}`);

    // Read every configuration file in Warp's directory.
    const files = await fs.readdir(warpConfigDir);

    // Find previous configurations for the same launch entry.
    const oldConfigFiles = files.filter(
      (file) => file.startsWith(`${FILE_PREFIX}${safeFileName}`) && file.endsWith(".yaml"),
    );

    if (oldConfigFiles.length > 0) {
      if (DEBUG) console.log(`Found ${oldConfigFiles.length} old config files to remove:`, oldConfigFiles);

      // Remove superseded config files.
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
 * Writes the Warp config to disk and returns the final path.
 */
async function writeConfigToWarpDir(config: WarpLaunchConfig): Promise<string> {
  const warpConfigDir = getWarpConfigDir();

  // Remove older configs for the same launch entry first.
  await cleanOldConfigFiles(config.name);

  // Ensure the Warp config directory exists.
  try {
    await mkdir(warpConfigDir, { recursive: true });
  } catch (error) {
    console.log("Error creating Warp config directory (it may already exist):", error);
  }

  // Build a filename-safe slug from the config name.
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

  // Verify the file was written correctly.
  const writtenContent = await import("fs/promises").then((fs) => fs.readFile(configPath, "utf-8"));
  if (DEBUG) {
    console.log("Written file content:");
    console.log(writtenContent);
  }

  return configPath;
}

/**
 * Launches a generated Warp configuration.
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

    // Double-check the config exists before launching it.
    try {
      const fs = await import("fs/promises");
      const stats = await fs.stat(configPath);
      if (DEBUG) console.log(`File verification ok, size: ${stats.size} bytes`);
    } catch (error) {
      console.error(`File verification failed:`, error);
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    // Warp expects the configuration name in the URL scheme, not the file path.
    const warpUrl = `warp://launch/${encodeURIComponent(config.name)}`;
    if (DEBUG) {
      console.log("Preparing to launch Warp...");
      console.log("Warp URL:", warpUrl);
      console.log("Config name:", config.name);
    }

    try {
      if (DEBUG) console.log("Try method1 - URL Scheme:", warpUrl);
      const result1 = await execFileAsync("open", [warpUrl]);
      if (DEBUG) {
        console.log("URL Scheme executed");
        console.log("stdout:", result1.stdout || "<empty>");
        if (result1.stderr) console.log("stderr:", result1.stderr);
      }

      // Give Warp a moment to start before checking the process list.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check whether Warp is now running.
      try {
        const psResult = await execFileAsync("pgrep", ["-x", "Warp"]);
        if (psResult.stdout.trim()) {
          if (DEBUG) console.log("Warp process detected; URL Scheme worked");
          return;
        }
      } catch {
        if (DEBUG) console.log("Warp process not detected; trying fallback...");
      }

      // Fallback 1: open the Warp application directly.
      if (DEBUG) console.log("Try method2 - open Warp app");
      await execFileAsync("open", ["-a", "Warp"]);
      if (DEBUG) console.log("Warp app open command executed");

      // Wait for Warp to finish launching.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fallback 2: use the Warp CLI when available.
      try {
        if (DEBUG) console.log("Try method3 - warp CLI check");
        const warpCliResult = await execFileAsync("which", ["warp"]);
        if (warpCliResult.stdout.trim()) {
          if (DEBUG) console.log("warp CLI found, launching config");
          await execFileAsync("warp", ["launch", config.name]);
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

    // Keep generated configs so users can relaunch them from Warp later.
    // Old files can still be cleaned up periodically.
  } catch (error) {
    console.error("Launch Warp failed:", error);
    throw new Error(`Failed to launch Warp: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks whether Warp is installed.
 */
export async function checkWarpInstalled(): Promise<boolean> {
  try {
    await execFileAsync("which", ["warp"]);
    return true;
  } catch {
    try {
      await execFileAsync("ls", ["/Applications/Warp.app"]);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Opens a project in a single Warp window without using a template.
 */
export async function launchProjectSimple(project: Project): Promise<void> {
  try {
    const warpUrl = `warp://action/new_window?path=${encodeURIComponent(project.path)}`;
    await execFileAsync("open", [warpUrl]);
  } catch (error) {
    throw new Error(`Failed to launch Warp: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a simple test configuration for local debugging.
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
 * Prints basic Warp diagnostics to the development console.
 */
export async function debugWarpEnvironment(): Promise<void> {
  console.log("Start Warp environment diagnostics...");

  // 1. Check whether Warp is installed.
  try {
    const result = await execFileAsync("which", ["warp"]);
    console.log("Warp CLI path:", result.stdout.trim());
  } catch {
    console.log("Warp CLI not found");
  }

  // 2. Check whether the app bundle exists.
  try {
    await execFileAsync("ls", ["-la", "/Applications/Warp.app"]);
    console.log("Warp.app installed");
  } catch {
    console.log("Warp.app not found in /Applications");
  }

  // 3. Inspect Warp's configuration directory.
  const configDir = getWarpConfigDir();
  try {
    const fs = await import("fs/promises");
    await fs.stat(configDir);
    console.log(`Config dir exists: ${configDir}`);

    // List existing launch configuration files.
    const files = await fs.readdir(configDir);
    console.log(`Config files: ${files.length}`);
    files.forEach((file) => console.log(`  - ${file}`));
  } catch (error) {
    console.log(`Config dir issue: ${configDir}`, error);
  }

  // 4. Verify the basic URL scheme works.
  try {
    console.log("Test basic URI launch...");
    await execFileAsync("open", ["warp://action/new_window"]);
    console.log("Basic URI launch success");
  } catch (error) {
    console.log("Basic URI launch failed:", error);
  }
  console.log("Warp environment diagnostics complete");
}
