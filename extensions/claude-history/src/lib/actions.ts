import { open, showToast, Toast, Clipboard } from "@raycast/api";
import { execSync } from "child_process";
import type { SessionSummary } from "./types.js";

/**
 * Copy the resume command to clipboard and paste into the active terminal.
 */
export async function resumeInTerminal(session: SessionSummary): Promise<void> {
  const command = `cd ${session.projectPath} && claude -r ${session.sessionId}`;
  await Clipboard.copy(command);
  await showToast({
    style: Toast.Style.Success,
    title: "Resume command copied",
    message: "Paste into your terminal",
  });
}

/**
 * Open the project directory in Finder.
 */
export async function openInFinder(projectPath: string): Promise<void> {
  await open(projectPath);
}

/**
 * Open the project directory in VS Code.
 */
export async function openInVSCode(projectPath: string): Promise<void> {
  try {
    execSync(`code "${projectPath}"`, { timeout: 5000 });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open VS Code",
    });
  }
}

/**
 * Copy the session ID to clipboard.
 */
export async function copySessionId(sessionId: string): Promise<void> {
  await Clipboard.copy(sessionId);
  await showToast({ style: Toast.Style.Success, title: "Session ID copied" });
}

/**
 * Copy the resume command to clipboard.
 */
export async function copyResumeCommand(
  session: SessionSummary,
): Promise<void> {
  const command = `cd ${session.projectPath} && claude -r ${session.sessionId}`;
  await Clipboard.copy(command);
  await showToast({
    style: Toast.Style.Success,
    title: "Resume command copied",
  });
}
