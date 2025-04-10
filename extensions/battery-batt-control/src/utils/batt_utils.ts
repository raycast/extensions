import { execSync } from "node:child_process";
import { showHUD } from "@raycast/api";
import { battPath, confirmAlertBatt } from "./init_batt";
import { existsSync, readFileSync, unlinkSync } from "node:fs";

/**
 * Execute a batt command with optional administrator privileges
 */
export async function executeBattCommand(command: string, requireAdmin = false, showOutput = true): Promise<string> {
  try {
    // Check if batt is available first
    const battAvailable = await confirmAlertBatt();
    if (!battAvailable) {
      throw new Error("Batt CLI not available. Please install it or specify a custom path in preferences.");
    }

    const battCmd = battPath();
    console.log(`Using batt command path: ${battCmd}`);

    // Instead of using just the command, construct a script that uses the full path
    // This ensures environment variables are properly set
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

      console.log(`Final output length: ${output.length}`);
      if (output.length > 0) {
        console.log(`Output preview (first 100 chars): ${output.substring(0, 100)}`);
      } else {
        console.log("Warning: Empty output received");
      }

      return output;
    } catch (execError: unknown) {
      const executionError = execError instanceof Error ? execError : new Error(String(execError));
      console.error(`Error executing command "${scriptCommand}": ${executionError.message}`);
      // Log stderr from the execution error if available
      if (executionError && typeof executionError === "object" && "stderr" in executionError) {
        console.error(`Command execution stderr: ${String((executionError as { stderr: unknown }).stderr)}`);
      }
      throw new Error(`Failed to execute batt command: ${executionError.message}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing batt command: ${errorMessage}`);
    if (showOutput) {
      await showHUD(`Error: ${errorMessage}`);
    }
    // You might want to include details from the original error if available
    if (error instanceof Error) {
      const stderr = (error as { stderr?: unknown })?.stderr;
      if (stderr) {
        console.error(`Stderr from failed command: ${String(stderr)}`);
      }
    }
    throw error;
  }
}

/**
 * Get battery status
 */
export async function getBatteryStatus(): Promise<string> {
  try {
    const battCmd = battPath();
    console.log(`Attempting to get battery status using: ${battCmd}`);

    // Try a direct approach with osascript first - this works reliably based on our testing
    try {
      console.log("Using osascript to run batt command...");
      // Create a temporary file for the output to avoid issues with Terminal output parsing
      let tempOutputFile = "";
      try {
        tempOutputFile = `/tmp/batt_status_${Date.now()}.txt`;
        const osascriptCmd = `/usr/bin/osascript -e 'do shell script "${battCmd} status > ${tempOutputFile} 2>&1"'`;

        // Execute the command via osascript
        execSync(osascriptCmd, { encoding: "utf8" });

        // Read the output from the temporary file
        if (existsSync(tempOutputFile)) {
          const output = readFileSync(tempOutputFile, "utf8").trim();

          // Clean up the temporary file
          try {
            unlinkSync(tempOutputFile);
          } catch {
            /* ignore cleanup errors */
          }

          if (output && output.trim() !== "") {
            console.log(`Successfully got batt output via osascript, length: ${output.length}`);
            return output;
          }
        }

        console.log("osascript approach produced no output");
      } finally {
        // Ensure cleanup of the temporary file
        if (existsSync(tempOutputFile)) {
          try {
            unlinkSync(tempOutputFile);
          } catch {
            /* ignore cleanup errors */
          }
        }
      }
    } catch (osascriptError) {
      console.error(
        "osascript approach failed:",
        osascriptError instanceof Error ? osascriptError.message : String(osascriptError),
      );
    }

    // Try using Terminal as a fallback, which we've confirmed works
    try {
      console.log("Trying with Terminal application via osascript...");
      // This approach will briefly flash a Terminal window but it works reliably
      let tempOutputFile = "";
      try {
        tempOutputFile = `/tmp/batt_status_terminal_${Date.now()}.txt`;
        const terminalCmd = `/usr/bin/osascript -e 'tell application "Terminal" to do script "${battCmd} status > ${tempOutputFile} && exit"'`;

        // Execute command via Terminal
        execSync(terminalCmd, { encoding: "utf8", timeout: 5000 });

        // Give Terminal a moment to complete the command and write the file
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Read the output from the temporary file
        if (existsSync(tempOutputFile)) {
          const output = readFileSync(tempOutputFile, "utf8").trim();

          // Clean up
          try {
            unlinkSync(tempOutputFile);
          } catch {
            /* ignore cleanup errors */
          }

          if (output && output.trim() !== "") {
            console.log(`Successfully got batt output via Terminal, length: ${output.length}`);
            return output;
          }
        }
      } finally {
        // Ensure cleanup of the temporary file
        if (existsSync(tempOutputFile)) {
          try {
            unlinkSync(tempOutputFile);
          } catch {
            /* ignore cleanup errors */
          }
        }
      }
    } catch (terminalError) {
      console.error(
        "Terminal approach failed:",
        terminalError instanceof Error ? terminalError.message : String(terminalError),
      );
    }

    // Use system command as fallback
    console.log("All batt command methods failed, using system power data as fallback");
    const pmsetOutput = execSync("pmset -g batt", { encoding: "utf8" }).toString().trim();
    if (pmsetOutput) {
      return `Battery status (from system):\n${pmsetOutput}\n\nNote: Retrieved from system as batt command is not returning data.`;
    }

    // If even the fallback fails, throw an error
    throw new Error("All methods to get battery status failed, including system fallback.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    console.error("Failed to get battery status:", errorMessage);
    // You might want to include details from the original error if available
    if (error instanceof Error) {
      const stderr = (error as { stderr?: unknown })?.stderr;
      if (stderr) {
        console.error(`Stderr from failed command: ${String(stderr)}`);
      }
    }
    throw new Error(`Failed to get battery status: ${errorMessage}`);
  }
}

/**
 * Set battery charge limit
 */
export async function setBatteryLimit(limit: number): Promise<string> {
  try {
    if (limit < 0 || limit > 100) {
      throw new Error("Battery limit must be between 0 and 100");
    }

    return await executeBattCommand(`limit ${limit}`, true, true);
  } catch (error) {
    console.error(`Failed to set battery limit to ${limit}:`, error);
    throw error;
  }
}

/**
 * Disable battery optimization
 */
export async function disableBatteryOptimization(): Promise<string> {
  try {
    return await executeBattCommand("disable", true, true);
  } catch (error) {
    console.error("Failed to disable battery optimization:", error);
    throw error;
  }
}
