/**
 * Process management system for Claude Desktop application lifecycle
 * Handles checking, quitting, and restarting Claude Desktop for seamless profile switching
 */

import { exec } from "child_process";
import { promisify } from "util";
import { StorageResult } from "../types";

const execAsync = promisify(exec);

// Claude Desktop application identifiers
const CLAUDE_APP_NAME = "Claude";
const CLAUDE_APP_PATH = "/Applications/Claude.app";

// Process management configuration
const PROCESS_CONFIG = {
  CHECK_TIMEOUT: 5000, // 5 seconds
  QUIT_TIMEOUT: 10000, // 10 seconds
  START_TIMEOUT: 15000, // 15 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  PROCESS_CHECK_INTERVAL: 500, // 500ms
} as const;

// Process status interface
interface ProcessStatus {
  isRunning: boolean;
  processId?: number;
  processName?: string;
}

// Process operation result with progress
interface ProcessOperationResult {
  success: boolean;
  message: string;
  error?: string;
  timeElapsed?: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute command with timeout
 */
async function execWithTimeout(command: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    execAsync(command)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Check if Claude Desktop is currently running
 */
export async function isClaudeRunning(): Promise<StorageResult<ProcessStatus>> {
  try {
    // Use pgrep to check for Claude process
    console.log(`Checking for Claude process with: pgrep -f "${CLAUDE_APP_NAME}"`);
    const { stdout } = await execWithTimeout(`pgrep -f "${CLAUDE_APP_NAME}"`, PROCESS_CONFIG.CHECK_TIMEOUT);
    console.log(`pgrep output: "${stdout.trim()}"`);

    // Also get detailed process info for debugging
    if (stdout.trim()) {
      try {
        const { stdout: psOutput } = await execWithTimeout(
          `ps aux | grep -i claude | grep -v grep`,
          PROCESS_CONFIG.CHECK_TIMEOUT,
        );
        console.log("Detailed Claude processes found:", psOutput);
      } catch (psError) {
        console.log("Could not get detailed process info:", psError);
      }
    }

    if (stdout.trim()) {
      const processIds = stdout
        .trim()
        .split("\n")
        .map((pid) => parseInt(pid, 10));
      const primaryPid = processIds[0];

      // Get process name for verification
      try {
        const { stdout: psOutput } = await execWithTimeout(
          `ps -p ${primaryPid} -o comm=`,
          PROCESS_CONFIG.CHECK_TIMEOUT,
        );

        return {
          success: true,
          data: {
            isRunning: true,
            processId: primaryPid,
            processName: psOutput.trim(),
          },
        };
      } catch {
        // If ps fails, still report as running based on pgrep
        return {
          success: true,
          data: {
            isRunning: true,
            processId: primaryPid,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        isRunning: false,
      },
    };
  } catch (error) {
    // pgrep returns exit code 1 when no processes found, which is normal
    if (error instanceof Error && error.message.includes("Command failed")) {
      return {
        success: true,
        data: {
          isRunning: false,
        },
      };
    }

    return {
      success: false,
      error: `Failed to check Claude status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if Claude Desktop application exists on the system
 */
export async function isClaudeInstalled(): Promise<StorageResult<boolean>> {
  try {
    // Check if Claude.app exists in Applications
    const { stdout } = await execWithTimeout(
      `test -d "${CLAUDE_APP_PATH}" && echo "exists"`,
      PROCESS_CONFIG.CHECK_TIMEOUT,
    );

    return {
      success: true,
      data: stdout.trim() === "exists",
    };
  } catch {
    return {
      success: true,
      data: false,
    };
  }
}

/**
 * Gracefully quit Claude Desktop using AppleScript
 */
async function quitClaudeAppleScript(): Promise<ProcessOperationResult> {
  const startTime = Date.now();

  try {
    const appleScript = `
      tell application "System Events"
        if exists (processes where name is "${CLAUDE_APP_NAME}") then
          tell application "${CLAUDE_APP_NAME}" to quit
          return "quit_requested"
        else
          return "not_running"
        end if
      end tell
    `;

    const { stdout } = await execWithTimeout(`osascript -e '${appleScript}'`, PROCESS_CONFIG.QUIT_TIMEOUT);

    const timeElapsed = Date.now() - startTime;

    if (stdout.trim() === "not_running") {
      return {
        success: true,
        message: "Claude Desktop was not running",
        timeElapsed,
      };
    }

    // Wait for process to actually quit
    let attempts = 0;
    const maxAttempts = Math.floor(PROCESS_CONFIG.QUIT_TIMEOUT / PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);

    while (attempts < maxAttempts) {
      const statusResult = await isClaudeRunning();
      if (statusResult.success && statusResult.data && !statusResult.data.isRunning) {
        return {
          success: true,
          message: "Claude Desktop quit successfully",
          timeElapsed: Date.now() - startTime,
        };
      }

      await sleep(PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);
      attempts++;
    }

    return {
      success: false,
      message: "Claude Desktop did not quit within timeout",
      error: "Quit timeout exceeded",
      timeElapsed: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to quit Claude Desktop via AppleScript",
      error: error instanceof Error ? error.message : String(error),
      timeElapsed: Date.now() - startTime,
    };
  }
}

/**
 * Force quit Claude Desktop using pkill (more reliable than killall)
 */
async function forceQuitClaude(): Promise<ProcessOperationResult> {
  const startTime = Date.now();

  try {
    console.log(`Force quitting Claude with: pkill -f "${CLAUDE_APP_NAME}"`);
    await execWithTimeout(`pkill -f "${CLAUDE_APP_NAME}"`, PROCESS_CONFIG.QUIT_TIMEOUT);
    console.log("pkill command executed successfully");

    // Wait for process to be killed
    let attempts = 0;
    const maxAttempts = Math.floor(PROCESS_CONFIG.QUIT_TIMEOUT / PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);

    while (attempts < maxAttempts) {
      const statusResult = await isClaudeRunning();
      console.log(`Force quit check attempt ${attempts + 1}/${maxAttempts}: Claude running status:`, statusResult);

      if (statusResult.success && statusResult.data && !statusResult.data.isRunning) {
        console.log("Claude Desktop force quit verified successfully");
        return {
          success: true,
          message: "Claude Desktop force quit successfully",
          timeElapsed: Date.now() - startTime,
        };
      }

      await sleep(PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);
      attempts++;
    }

    console.error("Claude Desktop did not quit after pkill within timeout");
    return {
      success: false,
      message: "Claude Desktop did not quit after force kill",
      error: "Force quit timeout exceeded",
      timeElapsed: Date.now() - startTime,
    };
  } catch (error) {
    console.error("pkill command failed:", error);
    // pkill returns exit code 1 if no processes found, which might be fine
    if (error instanceof Error && error.message.includes("Command failed")) {
      const statusResult = await isClaudeRunning();
      console.log("pkill failed, checking if Claude is actually running:", statusResult);

      if (statusResult.success && statusResult.data && !statusResult.data.isRunning) {
        console.log("pkill failed but Claude is not running - assuming success");
        return {
          success: true,
          message: "Claude Desktop was not running",
          timeElapsed: Date.now() - startTime,
        };
      }
    }

    return {
      success: false,
      message: "Failed to force quit Claude Desktop",
      error: error instanceof Error ? error.message : String(error),
      timeElapsed: Date.now() - startTime,
    };
  }
}

/**
 * Quit Claude Desktop with graceful fallback to force quit
 */
export async function quitClaude(): Promise<StorageResult<ProcessOperationResult>> {
  try {
    // First check if Claude is running
    const statusResult = await isClaudeRunning();
    if (!statusResult.success) {
      return {
        success: false,
        error: statusResult.error,
      };
    }

    if (!statusResult.data || !statusResult.data.isRunning) {
      return {
        success: true,
        data: {
          success: true,
          message: "Claude Desktop was not running",
          timeElapsed: 0,
        },
      };
    }

    // Try graceful quit first
    const gracefulResult = await quitClaudeAppleScript();
    if (gracefulResult.success) {
      return {
        success: true,
        data: gracefulResult,
      };
    }

    // Fall back to force quit
    console.warn("Graceful quit failed, attempting force quit:", gracefulResult.error);
    const forceResult = await forceQuitClaude();

    return {
      success: true,
      data: {
        ...forceResult,
        message: `${gracefulResult.message}. ${forceResult.message}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to quit Claude Desktop: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Start Claude Desktop application
 */
export async function startClaude(): Promise<StorageResult<ProcessOperationResult>> {
  const startTime = Date.now();

  try {
    // Check if Claude is already running
    const statusResult = await isClaudeRunning();
    if (!statusResult.success) {
      return {
        success: false,
        error: statusResult.error,
      };
    }

    if (statusResult.data && statusResult.data.isRunning) {
      return {
        success: true,
        data: {
          success: true,
          message: "Claude Desktop was already running",
          timeElapsed: Date.now() - startTime,
        },
      };
    }

    // Check if Claude is installed
    const installedResult = await isClaudeInstalled();
    if (!installedResult.success) {
      return {
        success: false,
        error: installedResult.error,
      };
    }

    if (!installedResult.data) {
      return {
        success: false,
        error: "Claude Desktop is not installed at /Applications/Claude.app",
      };
    }

    // Start Claude Desktop
    console.log(`Starting Claude Desktop with command: open "${CLAUDE_APP_PATH}"`);
    try {
      const openResult = await execWithTimeout(`open "${CLAUDE_APP_PATH}"`, PROCESS_CONFIG.START_TIMEOUT);
      console.log("Open command executed successfully:", openResult);
    } catch (openError) {
      console.error("Failed to execute open command:", openError);
      return {
        success: false,
        error: `Failed to launch Claude Desktop: ${openError instanceof Error ? openError.message : String(openError)}`,
      };
    }

    // Wait for process to start
    let attempts = 0;
    const maxAttempts = Math.floor(PROCESS_CONFIG.START_TIMEOUT / PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);
    console.log(
      `Waiting for Claude to start... (max ${maxAttempts} attempts, checking every ${PROCESS_CONFIG.PROCESS_CHECK_INTERVAL}ms)`,
    );

    while (attempts < maxAttempts) {
      await sleep(PROCESS_CONFIG.PROCESS_CHECK_INTERVAL);

      const statusResult = await isClaudeRunning();
      console.log(`Attempt ${attempts + 1}/${maxAttempts}: Claude running status:`, statusResult);

      if (statusResult.success && statusResult.data && statusResult.data.isRunning) {
        console.log("Claude Desktop started successfully!");
        return {
          success: true,
          data: {
            success: true,
            message: "Claude Desktop started successfully",
            timeElapsed: Date.now() - startTime,
          },
        };
      }

      attempts++;
    }

    const finalError = `Claude Desktop did not start within timeout (${PROCESS_CONFIG.START_TIMEOUT}ms, ${maxAttempts} attempts)`;
    console.error(finalError);
    return {
      success: false,
      error: finalError,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to start Claude Desktop: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Restart Claude Desktop (quit then start)
 */
export async function restartClaude(): Promise<
  StorageResult<{
    quitResult: ProcessOperationResult;
    startResult: ProcessOperationResult;
    totalTime: number;
  }>
> {
  const startTime = Date.now();
  console.log("Starting Claude Desktop restart process...");

  try {
    // First quit Claude
    console.log("Step 1: Quitting Claude Desktop...");
    const quitResult = await quitClaude();
    console.log("Quit result:", quitResult);
    if (!quitResult.success) {
      return {
        success: false,
        error: `Failed to quit Claude during restart: ${quitResult.error}`,
      };
    }

    // Wait longer for macOS to fully clean up the process before restarting
    console.log("Waiting for process cleanup before restart...");
    await sleep(PROCESS_CONFIG.RETRY_DELAY * 2); // 2 seconds instead of 1

    // Then start Claude
    console.log("Step 3: Starting Claude Desktop...");
    const startResult = await startClaude();
    console.log("Start result:", startResult);
    if (!startResult.success) {
      return {
        success: false,
        error: `Failed to start Claude during restart: ${startResult.error}`,
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`Claude Desktop restart completed successfully in ${totalTime}ms`);

    return {
      success: true,
      data: {
        quitResult: quitResult.data!,
        startResult: startResult.data!,
        totalTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to restart Claude Desktop: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Restart Claude Desktop with retry logic
 */
export async function restartClaudeWithRetry(): Promise<
  StorageResult<{
    quitResult: ProcessOperationResult;
    startResult: ProcessOperationResult;
    totalTime: number;
    attempts: number;
  }>
> {
  let lastError = "";

  for (let attempt = 1; attempt <= PROCESS_CONFIG.RETRY_ATTEMPTS; attempt++) {
    const result = await restartClaude();

    if (result.success) {
      return {
        success: true,
        data: {
          ...result.data!,
          attempts: attempt,
        },
      };
    }

    lastError = result.error || "Unknown error";

    if (attempt < PROCESS_CONFIG.RETRY_ATTEMPTS) {
      console.warn(`Restart attempt ${attempt} failed, retrying in ${PROCESS_CONFIG.RETRY_DELAY}ms:`, lastError);
      await sleep(PROCESS_CONFIG.RETRY_DELAY * attempt); // Exponential backoff
    }
  }

  return {
    success: false,
    error: `Failed to restart Claude Desktop after ${PROCESS_CONFIG.RETRY_ATTEMPTS} attempts. Last error: ${lastError}`,
  };
}

/**
 * Get detailed process information for debugging
 */
export async function getClaudeProcessInfo(): Promise<
  StorageResult<{
    isInstalled: boolean;
    isRunning: boolean;
    processInfo?: {
      pid: number;
      processName: string;
      startTime?: string;
      memoryUsage?: string;
    };
  }>
> {
  try {
    const installedResult = await isClaudeInstalled();
    const runningResult = await isClaudeRunning();

    if (!installedResult.success || !runningResult.success) {
      return {
        success: false,
        error: "Failed to get process information",
      };
    }

    const result: {
      isInstalled: boolean;
      isRunning: boolean;
      processInfo?: {
        pid: number;
        processName: string;
        startTime?: string;
        memoryUsage?: string;
      };
    } = {
      isInstalled: installedResult.data ?? false,
      isRunning: runningResult.data?.isRunning || false,
    };

    if (runningResult.data?.isRunning && runningResult.data.processId) {
      try {
        // Get detailed process information
        const { stdout } = await execWithTimeout(
          `ps -p ${runningResult.data.processId} -o pid,comm,lstart,rss`,
          PROCESS_CONFIG.CHECK_TIMEOUT,
        );

        const lines = stdout.trim().split("\n");
        if (lines.length > 1) {
          const processLine = lines[1].trim();
          const parts = processLine.split(/\s+/);

          result.processInfo = {
            pid: runningResult.data.processId,
            processName: runningResult.data.processName || parts[1] || "Unknown",
            startTime: parts.slice(2, -1).join(" ") || undefined,
            memoryUsage: parts[parts.length - 1] ? `${parts[parts.length - 1]} KB` : undefined,
          };
        }
      } catch {
        // If detailed info fails, still return basic info
        result.processInfo = {
          pid: runningResult.data.processId,
          processName: runningResult.data.processName || "Unknown",
        };
      }
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get Claude process info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
