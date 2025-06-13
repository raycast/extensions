/**
 * Terminal command execution utilities
 */

import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);

// Mock toast object for testing purposes
// This is only used in tests and won't affect production code
export const __mockToast = {
  style: null,
  title: null,
  message: null,
};

const PODMAN_PATH_BIN = "/opt/podman/bin";
const HOMEBREW_PATH_BIN = "/opt/homebrew/bin";

// Common error patterns and their user-friendly messages
const ERROR_PATTERNS = [
  { pattern: /command not found/i, message: "Command not found. Make sure all required tools are installed." },
  { pattern: /permission denied/i, message: "Permission denied. You may need to run with higher privileges." },
  { pattern: /no such file or directory/i, message: "File or directory not found. Check that paths are correct." },
  { pattern: /connection refused/i, message: "Connection refused. Make sure the service is running." },
  { pattern: /(timeout|timed out)/i, message: "Operation timed out. The service might be unresponsive." },
  { pattern: /cannot access/i, message: "Unable to access resource. Check permissions or network connection." },
  { pattern: /gradle/i, message: "Gradle issue detected. Check your project's build configuration." },
  { pattern: /sonarqube/i, message: "SonarQube error detected. Verify SonarQube server status and configuration." },
  { pattern: /podman/i, message: "Podman error detected. Verify Podman installation and configuration." },
];

/**
 * Get user-friendly error message based on error output
 */
export function getUserFriendlyErrorMessage(errorMsg: string): string {
  // Check if error matches any known patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorMsg)) {
      return `${message}\n\nDetails: ${errorMsg.substring(0, 100)}${errorMsg.length > 100 ? "..." : ""}`;
    }
  }
  // Default case - return truncated error
  return errorMsg.substring(0, 150) + (errorMsg.length > 150 ? "..." : "");
}

/**
 * Run a terminal command and show toast notifications for progress and results
 */
export async function runCommand(
  command: string,
  successMessage: string,
  failureMessage: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) {
  // Extract command name for better error reporting
  const commandName = command.split(" ")[0];

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Running: ${commandName}...`,
    message: "Preparing environment...",
  });

  try {
    // Update toast to show we're executing
    toast.message = "Executing command...";

    const currentProccessEnv = typeof process !== "undefined" ? process.env : {};
    const baseEnv = { ...currentProccessEnv, ...options?.env };

    const currentPath = baseEnv.PATH || "";
    const newPath = `${PODMAN_PATH_BIN}:${HOMEBREW_PATH_BIN}:${currentPath}`;

    const executionEnv = { ...baseEnv, PATH: newPath };

    const { stdout, stderr } = await execAsync(command, { ...options, env: executionEnv });

    if (stderr && !stderr.toLowerCase().includes("warning")) {
      toast.style = Toast.Style.Failure;
      toast.title = failureMessage;

      // Provide more context with the command that failed
      const friendlyErrorMsg = getUserFriendlyErrorMessage(stderr);
      toast.message = `Command '${commandName}' failed: ${friendlyErrorMsg}`;

      // Still log the full error for debugging
      console.error(`Error executing: ${command}`);
      console.error(stderr);
    } else {
      toast.style = Toast.Style.Success;
      toast.title = successMessage;

      // Format output for better readability
      if (stdout) {
        const truncatedOutput = stdout.length > 200 ? stdout.substring(0, 200) + "..." : stdout;
        toast.message = truncatedOutput;
        console.log(`Successfully executed: ${command}`);
        console.log(stdout);
      } else {
        toast.message = "Command completed successfully with no output.";
        console.log(`Successfully executed: ${command} (no output)`);
      }
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureMessage;

    // Handle JavaScript Error objects
    if (error instanceof Error) {
      const friendlyErrorMsg = getUserFriendlyErrorMessage(error.message);
      toast.message = `${friendlyErrorMsg}`;
    } else {
      toast.message = `Unknown error occurred`;
    }

    console.error(`Error executing: ${command}`, error);
  }
}

/**
 * Run a sequence of commands in a new terminal window with progress tracking
 */
export async function runInNewTerminal(
  commands: string[],
  successMessage: string,
  failureMessage: string,
  options?: { trackProgress?: boolean },
) {
  const showProgress = options?.trackProgress ?? true;

  // Generate a unique filename for tracking progress
  const timestamp = Date.now();
  const progressFile = `/tmp/raycast-sonarqube-${timestamp}.progress`;
  const errorFile = `/tmp/raycast-sonarqube-${timestamp}.error`;

  // Create a script that will run all commands with proper error handling
  let trackingScript = `#!/bin/bash\n`;
  trackingScript += `set -e\n\n`;

  if (showProgress) {
    trackingScript += `# Create progress tracking file\n`;
    trackingScript += `echo "0" > "${progressFile}"\n`;
    trackingScript += `echo "" > "${errorFile}"\n\n`;
  }

  trackingScript += `function cleanup() {\n`;
  trackingScript += `  echo "Cleaning up temporary files..."\n`;
  trackingScript += `  rm -f "${progressFile}" "${errorFile}"\n`;
  trackingScript += `}\n\n`;

  trackingScript += `function handle_error() {\n`;
  trackingScript += `  echo "Error occurred in command: $BASH_COMMAND" >&2\n`;
  if (showProgress) {
    trackingScript += `  echo "ERROR" > "${progressFile}"\n`;
    trackingScript += `  echo "$BASH_COMMAND failed with exit code $?" > "${errorFile}"\n`;
  }
  trackingScript += `  trap - ERR\n`;
  trackingScript += `  cleanup\n`;
  trackingScript += `  exit 1\n`;
  trackingScript += `}\n\n`;

  trackingScript += `trap handle_error ERR\n`;
  trackingScript += `trap cleanup EXIT\n\n`;

  trackingScript += `echo "Starting execution..."\n\n`;

  // Add each command with progress tracking
  const totalSteps = commands.length;
  commands.forEach((cmd, index) => {
    const progress = Math.round((index / totalSteps) * 100);
    const nextProgress = Math.round(((index + 1) / totalSteps) * 100);

    trackingScript += `# Step ${index + 1}/${totalSteps}\n`;
    trackingScript += `echo "\\n$ ${cmd}"\n`;

    if (showProgress) {
      trackingScript += `echo "${progress}" > "${progressFile}"\n`;
    }

    trackingScript += `${cmd}\n`;

    if (showProgress) {
      trackingScript += `echo "${nextProgress}" > "${progressFile}"\n`;
    }

    trackingScript += `echo "Command completed successfully."\n\n`;
  });

  trackingScript += `echo "All commands completed successfully!"\n`;
  if (showProgress) {
    trackingScript += `echo "100" > "${progressFile}"\n`;
  }
  trackingScript += `cleanup\n`;

  // Write the script to a temporary file
  const scriptFile = `/tmp/raycast-sonarqube-${timestamp}.sh`;
  await execAsync(`cat > "${scriptFile}" << 'EOF'\n${trackingScript}\nEOF`);
  await execAsync(`chmod +x "${scriptFile}"`);

  // Show an initial toast message
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running in terminal...",
    message: "Terminal window will open shortly",
  });

  try {
    // Run the script in a new terminal window
    await execAsync(`open -a Terminal "${scriptFile}"`);

    // If progress tracking is enabled, poll the progress file
    if (showProgress) {
      let lastProgress = 0;

      // Poll until the progress file reports 100% or ERROR
      let isCompleted = false;
      while (!isCompleted) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Read the current progress
          const { stdout: progressOutput } = await execAsync(`cat "${progressFile}" 2>/dev/null || echo "0"`);
          const progressValue = progressOutput.trim();

          // Check if there's an error
          if (progressValue === "ERROR") {
            const { stdout: errorOutput } = await execAsync(`cat "${errorFile}" 2>/dev/null || echo "Unknown error"`);
            throw new Error(errorOutput.trim());
          }

          // Parse progress as a number
          const progress = parseInt(progressValue, 10);

          // Update the toast if progress has changed
          if (!isNaN(progress) && progress !== lastProgress) {
            toast.message = `Progress: ${progress}%`;
            lastProgress = progress;
          }

          // If we've reached 100%, we're done
          if (progress === 100) {
            toast.style = Toast.Style.Success;
            toast.title = successMessage;
            toast.message = "All commands completed successfully!";
            isCompleted = true;
            break;
          }
        } catch (readError) {
          // If we can't read the file, it might have been deleted due to completion or error
          // Check if the script is still running
          const { stdout: psOutput } = await execAsync(`ps -ef | grep "${scriptFile}" | grep -v grep || echo ""`);

          if (!psOutput.trim()) {
            // Script is no longer running
            // Check if error file exists and has content
            try {
              const { stdout: errorExists } = await execAsync(`[ -f "${errorFile}" ] && echo "yes" || echo "no"`);

              if (errorExists.trim() === "yes") {
                const { stdout: errorContent } = await execAsync(
                  `cat "${errorFile}" 2>/dev/null || echo "Unknown error"`,
                );
                throw new Error(errorContent.trim());
              } else {
                // No error file, but script is done - assume success
                toast.style = Toast.Style.Success;
                toast.title = successMessage;
                toast.message = "Commands completed successfully!";
                isCompleted = true;
                break;
              }
            } catch (e) {
              // Can't check error file, assume failure
              throw new Error("Command execution failed without specific error details");
            }
          }
        }
      }
    } else {
      // If not tracking progress, just assume success
      toast.style = Toast.Style.Success;
      toast.title = successMessage;
      toast.message = "Terminal opened successfully";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureMessage;

    if (error instanceof Error) {
      toast.message = getUserFriendlyErrorMessage(error.message);
    } else {
      toast.message = "Failed to execute commands";
    }

    console.error("Terminal command execution failed:", error);
  }
}
