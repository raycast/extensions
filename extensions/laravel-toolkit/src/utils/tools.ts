import { exec } from "child_process";
import { promisify } from "util";
import { LocalStorage } from "@raycast/api";
import * as os from "os";

const execAsync = promisify(exec);

export type ToolManager = "chocolatey" | "scoop" | "npm" | "composer" | "manual" | "herd";

export interface DevTool {
  id: string;
  name: string;
  manager: ToolManager;
  versionCmd: string;
  updateCmd: string;
  installVersionCmd?: string; // Command to install specific version
  uninstallCmd?: string; // Command to remove
  isCustom: boolean;
  detectedVersion?: string;
}

const CUSTOM_TOOLS_KEY = "custom_dev_tools";

/**
 * Detects the package manager used for a specific binary by checking its path
 */
async function detectManager(binary: string): Promise<ToolManager> {
  if (os.platform() !== "win32") return "manual"; // Only smart detect on Windows for now

  try {
    const { stdout } = await execAsync(`where ${binary}`);
    const path = stdout.toLowerCase();

    if (path.includes("herd")) return "herd";
    if (path.includes("chocolatey")) return "chocolatey";
    if (path.includes("scoop")) return "scoop";
    if (path.includes("npm") || path.includes("node_modules")) return "npm";
  } catch {
    // Binary not found
  }
  return "manual";
}

/**
 * Generates default commands based on the detected manager
 */
export async function getPresets(): Promise<DevTool[]> {
  const tools: DevTool[] = [];

  // 1. PHP
  const phpManager = await detectManager("php");
  const phpTool: DevTool = {
    id: "php",
    name: "PHP",
    manager: phpManager,
    versionCmd: "php -v",
    updateCmd: "",
    isCustom: false,
  };

  switch (phpManager) {
    case "chocolatey":
      phpTool.updateCmd = "choco upgrade php -y";
      phpTool.installVersionCmd = "choco install php --version={version} --allow-downgrade -y";
      phpTool.uninstallCmd = "choco uninstall php --remove-dependencies --force -y";
      break;
    case "scoop":
      phpTool.updateCmd = "scoop update php";
      phpTool.installVersionCmd = "scoop install php@{version}";
      phpTool.uninstallCmd = "scoop uninstall php --purge";
      break;
    case "herd":
      phpTool.updateCmd = "herd update";
      phpTool.uninstallCmd = "echo 'Herd manages its own binaries. Use Herd GUI to uninstall.'";
      break;
    default:
      phpTool.updateCmd = "echo 'Manual update required'";
      phpTool.uninstallCmd = "echo 'Manual install: Remove the PHP folder manually'";
  }
  tools.push(phpTool);

  // 2. Composer
  tools.push({
    id: "composer",
    name: "Composer",
    manager: "composer",
    versionCmd: "composer --version",
    updateCmd: "composer self-update",
    installVersionCmd: "composer self-update {version}",
    uninstallCmd: "composer global remove composer",
    isCustom: false,
  });

  // 3. NPM
  tools.push({
    id: "npm",
    name: "NPM",
    manager: "npm",
    versionCmd: "npm -v",
    updateCmd: "npm install -g npm@latest",
    installVersionCmd: "npm install -g npm@{version}",
    uninstallCmd: "npm uninstall -g npm",
    isCustom: false,
  });

  // 4. Laravel Installer
  tools.push({
    id: "laravel",
    name: "Laravel Installer",
    manager: "composer",
    versionCmd: "laravel --version",
    updateCmd: "composer global require laravel/installer",
    uninstallCmd: "composer global remove laravel/installer",
    isCustom: false,
  });

  // 5. Git
  tools.push({
    id: "git",
    name: "Git",
    manager: await detectManager("git"),
    versionCmd: "git --version",
    updateCmd: "echo 'Update Git via your system package manager'",
    uninstallCmd: "echo 'Uninstall Git via system config'",
    isCustom: false,
  });

  // 6. Node.js
  tools.push({
    id: "node",
    name: "Node.js",
    manager: await detectManager("node"),
    versionCmd: "node -v",
    updateCmd: "echo 'Use nvm or installer to update Node'",
    uninstallCmd: "echo 'Uninstall Node via system config'",
    isCustom: false,
  });

  // 7. Docker
  tools.push({
    id: "docker",
    name: "Docker",
    manager: "manual",
    versionCmd: "docker --version",
    updateCmd: "echo 'Update Docker Desktop app'",
    uninstallCmd: "echo 'Uninstall Docker Desktop'",
    isCustom: false,
  });

  // 8. MySQL
  tools.push({
    id: "mysql",
    name: "MySQL",
    manager: await detectManager("mysql"),
    versionCmd: "mysql --version",
    updateCmd: "echo 'Update MySQL via system manager'",
    uninstallCmd: "echo 'Uninstall MySQL via system manager'",
    isCustom: false,
  });

  return tools;
}

export async function getCustomTools(): Promise<DevTool[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_TOOLS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveCustomTool(tool: DevTool) {
  const tools = await getCustomTools();
  const existing = tools.findIndex((t) => t.id === tool.id);
  if (existing !== -1) {
    tools[existing] = tool;
  } else {
    tools.push(tool);
  }
  await LocalStorage.setItem(CUSTOM_TOOLS_KEY, JSON.stringify(tools));
}

export async function removeCustomTool(id: string) {
  const tools = await getCustomTools();
  const filtered = tools.filter((t) => t.id !== id);
  await LocalStorage.setItem(CUSTOM_TOOLS_KEY, JSON.stringify(filtered));
}

export async function getVersion(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd);
    // Try to extract strict version number X.X.X
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : stdout.trim().split("\n")[0]; // Fallback to first line
  } catch {
    return "Not Installed";
  }
}
