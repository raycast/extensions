import { runAppleScript } from "run-applescript";
import { showHUD, showToast, Toast } from "@raycast/api";
import { readFileSync, existsSync, unlinkSync } from "fs";

const RESPONSE_FILE_PATH = "/tmp/pin-response.json";
const URL_SCHEME = "pin";

export interface AgentStatus {
  state: string;
  pinned: boolean;
  targetAppName: string | null;
  targetWindowTitle: string | null;
  mirrorVisible: boolean;
  pinnedSince: string | null;
}

export interface WindowInfo {
  windowID: number;
  pid: number;
  appName: string;
  windowTitle: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Check if the agent is running
 */
export async function isAgentRunning(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        set agentRunning to (name of processes) contains "Pin"
        return agentRunning
      end tell
    `;
    const result = await runAppleScript(script);
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Launch the agent application
 */
export async function launchAgent(): Promise<boolean> {
  try {
    const script = `
      try
        tell application "Pin" to activate
        return "success"
      on error
        return "error"
      end try
    `;
    const result = await runAppleScript(script);
    return result === "success";
  } catch {
    return false;
  }
}

/**
 * Clear the response file
 */
function clearResponseFile(): void {
  try {
    if (existsSync(RESPONSE_FILE_PATH)) {
      unlinkSync(RESPONSE_FILE_PATH);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Read response from the response file with retry
 */
async function readResponse(
  maxWaitMs = 2000,
): Promise<Record<string, unknown> | null> {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      if (existsSync(RESPONSE_FILE_PATH)) {
        const content = readFileSync(RESPONSE_FILE_PATH, "utf-8");
        const response = JSON.parse(content) as Record<string, unknown>;
        return response;
      }
    } catch {
      // File might be being written, retry
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return null;
}

/**
 * Send a command to the agent via URL scheme (background, doesn't steal focus)
 */
async function sendCommand(command: string): Promise<Record<string, unknown>> {
  // First check if agent is running
  const running = await isAgentRunning();
  if (!running) {
    throw new Error("Agent not running");
  }

  // Clear any previous response
  clearResponseFile();

  // Open URL scheme in background to avoid stealing focus
  const url = `${URL_SCHEME}://${command}`;
  const script = `do shell script "open -g '${url}'"`;
  await runAppleScript(script);

  // Wait for and read response
  const response = await readResponse();
  if (!response) {
    throw new Error("No response from agent");
  }

  if (response.error) {
    throw new Error(String(response.error));
  }

  return response;
}

/**
 * Pin the active window
 */
export async function pinActiveWindow(): Promise<void> {
  try {
    await sendCommand("pin");
    await showHUD("Window pinned");
  } catch (error) {
    if ((error as Error).message === "Agent not running") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Agent Not Running",
        message: "Launch the agent first using 'Launch Agent' command",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Pin",
        message: (error as Error).message,
      });
    }
  }
}

/**
 * Unpin the current window
 */
export async function unpin(): Promise<void> {
  try {
    await sendCommand("unpin");
    await showHUD("Window unpinned");
  } catch (error) {
    if ((error as Error).message === "Agent not running") {
      await showHUD("No window pinned");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Unpin",
        message: (error as Error).message,
      });
    }
  }
}

/**
 * Get current status
 */
export async function getStatus(): Promise<AgentStatus | null> {
  try {
    const response = await sendCommand("status");
    return response as unknown as AgentStatus;
  } catch {
    return null;
  }
}

/**
 * Get list of all windows
 */
export async function listWindows(): Promise<WindowInfo[]> {
  try {
    const response = await sendCommand("list-windows");
    if (response.success && Array.isArray(response.windows)) {
      return response.windows as WindowInfo[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Pin a specific window by ID
 */
export async function pinWindowById(windowID: number): Promise<void> {
  try {
    await sendCommand(`pin-window?id=${windowID}`);
    await showHUD("Window pinned");
  } catch (error) {
    if ((error as Error).message === "Agent not running") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Agent Not Running",
        message: "Launch the agent first using 'Launch Agent' command",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Pin",
        message: (error as Error).message,
      });
    }
  }
}
