import { execSync } from "node:child_process";
import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { preferences, BatteryTool } from "./getPreference";
import { bclmPath, confirmAlertBrew } from "./initBCLM";
import { battPath, confirmAlertBatt } from "./initBatt";

// Helper function to determine if we should use BCLM or BATT
export const getBatteryTool = () => {
  return preferences.batteryTool;
};

// Get the path of the appropriate battery tool
export const getBatteryToolPath = async (): Promise<string> => {
  const tool = getBatteryTool();

  if (tool === BatteryTool.BCLM) {
    const detectBrew = await confirmAlertBrew();
    if (!detectBrew) {
      throw new Error("BCLM not found");
    }
    return bclmPath();
  } else {
    const detectBatt = await confirmAlertBatt();
    if (!detectBatt) {
      throw new Error("BATT not found");
    }
    return battPath();
  }
};

// Map commands between BCLM and BATT
export const mapBatteryCommand = (command: string, threshold?: number): string => {
  const tool = getBatteryTool();

  if (tool === BatteryTool.BCLM) {
    if (command === "read") return "read";
    if (command === "write" && threshold !== undefined) return `write ${threshold}`;
    if (command === "persist") return "persist";
    if (command === "unpersist") return "unpersist";
    return command;
  } else {
    if (command === "read") return "status";
    if (command === "write" && threshold !== undefined) return `limit ${threshold}`;
    // BATT doesn't have separate persist/unpersist commands
    // The limit command already persists settings
    if (command === "persist")
      throw new Error("'persist' command not needed for BATT - settings are persisted automatically");
    if (command === "unpersist") return "disable";
    return command;
  }
};

// Parse the output of the battery tool
export const parseBatteryOutput = (output: string): number => {
  const tool = getBatteryTool();

  console.log(`Parsing ${tool} output: ${output.substring(0, 300)}`);

  if (tool === BatteryTool.BCLM) {
    // BCLM returns just the number, so return it directly
    return parseInt(output.trim(), 10);
  } else {
    // BATT returns more info, extract the limit value
    // First try to match "Charging limit: X%"
    const limitMatch = output.match(/[Cc]harging limit: (\d+)%/);
    if (limitMatch) {
      console.log(`Found charge limit in output: ${limitMatch[1]}`);
      return parseInt(limitMatch[1], 10);
    }

    // Try to match "charge limit is set to X%"
    const limitMatch2 = output.match(/charge limit is set to (\d+)%/);
    if (limitMatch2) {
      console.log(`Found charge limit in output: ${limitMatch2[1]}`);
      return parseInt(limitMatch2[1], 10);
    }

    // Try to match any number followed by % in a battery limit context
    const percentMatch = output.match(/(?:limit|charging|max charge)[^\d]+(\d+)%/i);
    if (percentMatch) {
      console.log(`Found percentage in battery limit context: ${percentMatch[1]}`);
      return parseInt(percentMatch[1], 10);
    }

    console.log("No matching pattern found, returning default 100");
    return 100;
  }
};

/**
 * Execute a BATT command with optional administrator privileges
 */
export async function executeBattCommand(command: string, requireAdmin = false, showOutput = true): Promise<string> {
  try {
    const battCmd = await getBatteryToolPath();
    console.log(`Using battery tool path: ${battCmd}`);

    // Construct a script that uses the full path
    const scriptCommand = requireAdmin ? `sudo ${battCmd} ${command}` : `${battCmd} ${command}`;
    console.log(`Executing command: ${scriptCommand}`);

    let output = "";
    try {
      // Directly execute the command using child_process
      try {
        output = execSync(scriptCommand, {
          encoding: "utf8",
          maxBuffer: 1024 * 1024, // 1MB buffer
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ""}`,
          },
          stdio: ["pipe", "pipe", "pipe"], // Capture both stdout and stderr
        })
          .toString()
          .trim();

        console.log(`Direct execution successful, output length: ${output.length}`);
      } catch (directError: unknown) {
        // If direct execution fails, try via osascript
        console.log(
          `Direct execution failed: ${directError instanceof Error ? directError.message : String(directError)}`,
        );
        if (typeof directError === "object" && directError !== null && "stderr" in directError) {
          console.log(`stderr: ${String((directError as { stderr: unknown }).stderr)}`);
        }

        try {
          const safeCommand = scriptCommand.replace(/"/g, '\\"');
          const osascriptCommand = requireAdmin
            ? `/usr/bin/osascript -e 'do shell script "${safeCommand}" with administrator privileges'`
            : `/usr/bin/osascript -e 'do shell script "${safeCommand}"'`;

          console.log(`Trying with osascript: ${osascriptCommand}`);

          output = execSync(osascriptCommand, {
            encoding: "utf8",
            maxBuffer: 1024 * 1024, // 1MB buffer
          })
            .toString()
            .trim();

          console.log(`osascript execution successful, output length: ${output.length}`);
        } catch (osaError: unknown) {
          console.error(
            `osascript execution failed: ${osaError instanceof Error ? osaError.message : String(osaError)}`,
          );
          if (typeof osaError === "object" && osaError !== null && "stderr" in osaError) {
            console.error(`stderr: ${String((osaError as { stderr: unknown }).stderr)}`);
          }

          // As a last resort, try using the system shell directly
          console.log("Trying with direct shell invocation as last resort");
          output = execSync(`/bin/sh -c "${battCmd} ${command.replace(/"/g, '\\"')}"`, {
            encoding: "utf8",
          })
            .toString()
            .trim();
        }
      }

      if (showOutput) {
        // Slightly adjust HUD message based on admin requirement
        const message = requireAdmin ? "Command executed with admin privileges" : `Command executed: ${command}`;
        await showHUD(message);
      }

      return output;
    } catch (execError: unknown) {
      const executionError = execError instanceof Error ? execError : new Error(String(execError));
      console.error(`Error executing command "${scriptCommand}": ${executionError.message}`);
      showFailureToast(executionError, { title: "Failed to execute battery command" });
      throw new Error(`Failed to execute battery command: ${executionError.message}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing battery command: ${errorMessage}`);
    if (showOutput) {
      showFailureToast(error, { title: "Error executing battery command" });
    }
    throw error;
  }
}

/**
 * Get battery status for either BCLM or BATT
 */
export async function getBatteryStatus(): Promise<string> {
  try {
    const toolPath = await getBatteryToolPath();
    const readCommand = mapBatteryCommand("read");

    const currentTool = getBatteryTool();
    console.log(`Getting battery status using ${currentTool} (${toolPath} ${readCommand})`);

    // Try using the executeBattCommand function first
    try {
      const output = await executeBattCommand(readCommand, false, false);
      console.log(`Command output: ${output.substring(0, 300)}`);
      return output;
    } catch (directError) {
      console.error("Command execution failed:", directError);

      // Try direct execution as a fallback
      try {
        console.log("Trying direct execution...");
        const output = execSync(`${toolPath} ${readCommand}`, {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ""}`,
          },
        })
          .toString()
          .trim();
        console.log(`Direct execution output: ${output.substring(0, 300)}`);
        return output;
      } catch (execError) {
        console.error("Direct execution failed:", execError);

        // Use system command as fallback
        console.log("Using pmset as fallback...");
        const pmsetOutput = execSync("pmset -g batt", { encoding: "utf8" }).toString().trim();
        console.log(`pmset output: ${pmsetOutput}`);
        if (pmsetOutput) {
          return `Battery status (from system):\n${pmsetOutput}\n\nNote: Retrieved from system as ${currentTool} command is not returning data.`;
        }

        throw execError;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    console.error("Failed to get battery status:", errorMessage);
    throw new Error(`Failed to get battery status: ${errorMessage}`);
  }
}

/**
 * Set battery charge limit for either BCLM or BATT
 */
export async function setBatteryLimit(limit: number): Promise<string> {
  try {
    if (limit < 0 || limit > 100) {
      throw new Error("Battery limit must be between 0 and 100");
    }

    const writeCommand = mapBatteryCommand("write", limit);

    return await executeBattCommand(writeCommand, true, true);
  } catch (error) {
    console.error(`Failed to set battery limit to ${limit}:`, error);
    throw error;
  }
}

/**
 * Disable battery optimization for either BCLM or BATT
 */
export async function disableBatteryOptimization(): Promise<string> {
  try {
    const unpersistCommand = mapBatteryCommand("unpersist");
    return await executeBattCommand(unpersistCommand, true, true);
  } catch (error) {
    console.error("Failed to disable battery optimization:", error);
    throw error;
  }
}
