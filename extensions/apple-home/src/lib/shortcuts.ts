import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { readFile, unlink } from "fs/promises";

export interface Shortcut {
  name: string;
  accessoryName: string;
  action: "on" | "off" | "toggle" | "other";
  isOn?: boolean;
}

/**
 * Execute a command with a timeout
 */
function execWithTimeout(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * List all shortcuts from a specific folder in the Shortcuts app
 * Filters out "Get X State" utility shortcuts
 */
export async function listShortcuts(folderName: string): Promise<Shortcut[]> {
  try {
    const stdout = await execWithTimeout("shortcuts", ["list", "-f", folderName], 5000);
    const lines = stdout.trim().split("\n").filter(Boolean);
    const allNames = lines.map((name) => name.trim());

    // Find all state shortcut accessory names
    const stateAccessoryNames = new Set(
      allNames
        .filter((name) => isStateShortcut(name))
        .map((name) => getAccessoryNameFromStateShortcut(name).toLowerCase()),
    );

    // Filter out state shortcuts and parse the rest
    return allNames
      .filter((name) => !isStateShortcut(name))
      .map((name) => {
        const hasStateShortcut = stateAccessoryNames.has(name.toLowerCase());
        return parseShortcutName(name, hasStateShortcut);
      });
  } catch (error) {
    // If folder doesn't exist, is empty, or there's an error listing shortcuts
    // return empty array so the empty view can guide the user
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("no shortcuts") ||
        message.includes("folder") ||
        message.includes("doesn't exist") ||
        message.includes("not found")
      ) {
        return [];
      }
    }
    throw error;
  }
}

/**
 * Run a shortcut by name (fire and forget - doesn't wait for completion)
 */
export function runShortcut(shortcutName: string): void {
  const child = spawn("shortcuts", ["run", shortcutName], {
    detached: true,
    stdio: "ignore",
  });
  // Detach the child process so it runs independently
  child.unref();
}

/**
 * Run a shortcut and capture its output by writing to a temp file
 */
export async function runShortcutWithOutput(shortcutName: string, timeoutMs = 3000): Promise<string> {
  const outputPath = join(tmpdir(), `raycast-homekit-${Date.now()}.txt`);

  return new Promise((resolve) => {
    const child = spawn("shortcuts", ["run", shortcutName, "-o", outputPath], {
      stdio: ["ignore", "ignore", "ignore"],
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve("");
    }, timeoutMs);

    child.on("close", async () => {
      clearTimeout(timeout);
      try {
        const output = await readFile(outputPath, "utf-8");
        await unlink(outputPath).catch(() => {});
        resolve(output.trim());
      } catch {
        resolve("");
      }
    });

    child.on("error", () => {
      clearTimeout(timeout);
      resolve("");
    });
  });
}

/**
 * Get the state of an accessory by running its state shortcut
 * Supports: "Get [Name] State" or "Get State of [Name]"
 * Returns true if on, false if off, undefined if unknown
 */
export async function getAccessoryState(accessoryName: string, folderName: string): Promise<boolean | undefined> {
  // Try both naming patterns
  const possibleNames = [`Get ${accessoryName} State`, `Get State of ${accessoryName}`];

  try {
    // Get all shortcuts including state shortcuts to find the right one
    const stdout = await execWithTimeout("shortcuts", ["list", "-f", folderName], 5000);
    const allNames = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((n) => n.trim());

    // Find which state shortcut exists (case-insensitive)
    const stateShortcutName = possibleNames.find((pattern) =>
      allNames.some((name) => name.toLowerCase() === pattern.toLowerCase()),
    );

    if (!stateShortcutName) {
      return undefined;
    }

    // Find the actual name with correct casing
    const actualName = allNames.find((name) => name.toLowerCase() === stateShortcutName.toLowerCase());

    if (!actualName) {
      return undefined;
    }

    const output = await runShortcutWithOutput(actualName);
    const lowerOutput = output.toLowerCase().trim();

    // Check for common on/off indicators
    if (lowerOutput.includes("on") || lowerOutput === "1" || lowerOutput === "true") {
      return true;
    }
    if (lowerOutput.includes("off") || lowerOutput === "0" || lowerOutput === "false") {
      return false;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if a shortcut name is a "Get State" utility shortcut
 * Supports: "Get X State" or "Get State of X"
 */
export function isStateShortcut(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (lowerName.startsWith("get ") && lowerName.endsWith(" state")) || lowerName.startsWith("get state of ");
}

/**
 * Extract accessory name from a state shortcut
 * Supports: "Get X State" -> "X" or "Get State of X" -> "X"
 */
export function getAccessoryNameFromStateShortcut(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith("get state of ")) {
    // "Get State of Console" -> "Console"
    return name.slice(13);
  }
  // "Get Console State" -> "Console"
  return name.slice(4, -6);
}

/**
 * Parse a shortcut name to extract accessory info and action
 * Examples:
 * - "Turn on Living Room Light" -> { name: "...", accessoryName: "Living Room Light", action: "on" }
 * - "Turn off Kitchen" -> { name: "...", accessoryName: "Kitchen", action: "off" }
 * - "Toggle Bedroom Fan" -> { name: "...", accessoryName: "Bedroom Fan", action: "toggle" }
 * - "Console" (with matching "Get Console State") -> { name: "Console", accessoryName: "Console", action: "toggle" }
 */
function parseShortcutName(name: string, hasStateShortcut: boolean): Shortcut {
  const lowerName = name.toLowerCase();

  let action: Shortcut["action"] = "other";
  let accessoryName = name;

  if (lowerName.startsWith("turn on ")) {
    action = "on";
    accessoryName = name.slice(8); // Remove "Turn on "
  } else if (lowerName.startsWith("turn off ")) {
    action = "off";
    accessoryName = name.slice(9); // Remove "Turn off "
  } else if (lowerName.startsWith("toggle ")) {
    action = "toggle";
    accessoryName = name.slice(7); // Remove "Toggle "
  } else if (hasStateShortcut) {
    // If there's a matching "Get X State" shortcut, treat this as a toggle
    action = "toggle";
  }

  return {
    name,
    accessoryName,
    action,
  };
}

/**
 * Get a human-readable action label
 */
export function getActionLabel(action: Shortcut["action"]): string {
  switch (action) {
    case "on":
      return "Turn On";
    case "off":
      return "Turn Off";
    case "toggle":
      return "Toggle";
    default:
      return "Scene";
  }
}
