import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { IvantiConnectionState } from "./types";

const execFileAsync = promisify(execFile);

export const IVANTI_APP_PATH = "/Applications/Ivanti Secure Access.app";
const OSASCRIPT_PATH = "/usr/bin/osascript";
const PGREP_PATH = "/usr/bin/pgrep";
const FIELD_SEPARATOR = "\u001f";
const IVANTI_PROCESS_NAME = "Ivanti Secure Access";
const STATUS_MENU_BAR_INDEX = 2;
const STATUS_MENU_ITEM_INDEX = 1;
const IVANTI_LAUNCH_DELAY_SECONDS = 0.3;
const STATUS_MENU_OPEN_DELAY_SECONDS = 0.12;

export class IvantiAutomationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IvantiAutomationError";
  }
}

export async function isIvantiInstalled(): Promise<boolean> {
  try {
    await access(IVANTI_APP_PATH, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isIvantiRunning(): Promise<boolean> {
  try {
    await execFileAsync(PGREP_PATH, ["-x", "Ivanti Secure Access"], { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export async function listConnectionStates(): Promise<IvantiConnectionState[]> {
  if (!(await isIvantiRunning())) {
    return [];
  }

  // Serialize each connection as a single line to keep parsing in TypeScript
  // simple and avoid depending on AppleScript record formatting.
  const output = await runAppleScript([
    `using terms from application "${IVANTI_APP_PATH}"`,
    `tell application "${IVANTI_APP_PATH}"`,
    `set serializedConnections to {}`,
    `repeat with currentConnection in every connection`,
    `set connectionFields to {(connectionDisplayName of currentConnection), (connectionButtonTitle of currentConnection), (connectionStatus of currentConnection), (connectionServerUrl of currentConnection)}`,
    `set AppleScript's text item delimiters to "${FIELD_SEPARATOR}"`,
    `set end of serializedConnections to connectionFields as text`,
    `end repeat`,
    `set AppleScript's text item delimiters to linefeed`,
    `set serializedOutput to serializedConnections as text`,
    `set AppleScript's text item delimiters to ""`,
    `return serializedOutput`,
    `end tell`,
    `end using terms from`,
  ]);

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", buttonTitle = "", status = "", uri = ""] = line.split(FIELD_SEPARATOR);
      return { buttonTitle, name, status, uri };
    })
    .filter((connection) => connection.name || connection.uri);
}

export async function runTrayConnectionCommand(
  connectionName: string,
  action: "connect" | "disconnect",
): Promise<void> {
  const actionLabels = getTrayActionLabels(action);

  await runAppleScript([
    `tell application "${IVANTI_APP_PATH}" to launch`,
    `delay ${IVANTI_LAUNCH_DELAY_SECONDS}`,
    `tell application "System Events"`,
    `if not (exists process "${IVANTI_PROCESS_NAME}") then`,
    `error "Ivanti Secure Access is not running."`,
    `end if`,
    `tell process "${IVANTI_PROCESS_NAME}"`,
    `if (count of menu bars) < ${STATUS_MENU_BAR_INDEX} then`,
    `error "Ivanti Secure Access status menu is not available."`,
    `end if`,
    `tell menu bar item ${STATUS_MENU_ITEM_INDEX} of menu bar ${STATUS_MENU_BAR_INDEX}`,
    `click`,
    `delay ${STATUS_MENU_OPEN_DELAY_SECONDS}`,
    `if not (exists menu item "${escapeAppleScriptString(connectionName)}" of menu 1) then`,
    `key code 53`,
    `error "Connection '${escapeAppleScriptString(connectionName)}' was not found in the Ivanti status menu."`,
    `end if`,
    `tell menu item "${escapeAppleScriptString(connectionName)}" of menu 1`,
    `if not (exists menu 1) then`,
    `click`,
    `return`,
    `end if`,
    `set actionClicked to false`,
    ...actionLabels.flatMap((label) => [
      `if actionClicked is false then`,
      `try`,
      `click menu item "${escapeAppleScriptString(label)}" of menu 1`,
      `set actionClicked to true`,
      `end try`,
      `end if`,
    ]),
    `if actionClicked is false then`,
    `key code 53`,
    `error "No '${action}' action was found for connection '${escapeAppleScriptString(connectionName)}' in the Ivanti status menu."`,
    `end if`,
    `end tell`,
    `end tell`,
    `end tell`,
    `end tell`,
  ]);
}

async function runAppleScript(lines: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      OSASCRIPT_PATH,
      lines.flatMap((line) => ["-e", line]),
      {
        maxBuffer: 1024 * 1024,
        timeout: 15000,
      },
    );

    return stdout.trim();
  } catch (error) {
    throw toAutomationError(error);
  }
}

function toAutomationError(error: unknown): IvantiAutomationError {
  if (error instanceof IvantiAutomationError) {
    return error;
  }

  const message = extractErrorMessage(error);
  // Surface common macOS Automation failures with actionable guidance.
  if (message.includes("-10827")) {
    return new IvantiAutomationError(
      "Unable to reach Ivanti Secure Access via AppleScript. Open the app once and grant Automation permission, then retry.",
    );
  }

  if (message.includes("-1743")) {
    return new IvantiAutomationError(
      "Raycast is not allowed to control Ivanti Secure Access. Grant Automation permission and retry.",
    );
  }

  if (
    message.includes("-1719") ||
    message.includes("not allowed assistive access") ||
    message.includes("不允许辅助访问")
  ) {
    return new IvantiAutomationError(
      "Raycast is not allowed to use Accessibility. Grant Accessibility permission to Raycast and retry.",
    );
  }

  return new IvantiAutomationError(message || "Ivanti Secure Access automation failed.");
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = Reflect.get(error, "stderr") ?? Reflect.get(error, "stdout");
    if (typeof candidate === "string") {
      return candidate.trim();
    }
  }

  return String(error);
}

function escapeAppleScriptString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function getTrayActionLabels(action: "connect" | "disconnect"): string[] {
  if (action === "connect") {
    return ["连接", "Connect", "连接(&C)", "连接网络(&C)", "单击以连接"];
  }

  return ["断开连接", "Disconnect", "断开网络连接", "断开网络连接(&D)", "单击以断开连接"];
}
