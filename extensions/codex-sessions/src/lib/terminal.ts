import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { access } from "node:fs/promises";
import { getTerminalPreference, showFailureToast } from "./open-codex";
import { resolveCodexBinary } from "./codex-paths";

function shellEscape(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function appleScriptEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n").replaceAll("\r", "\\r");
}

function resumeCommand(binary: string, cwd: string | undefined, threadId: string): string {
  const parts = [shellEscape(binary), "resume", shellEscape(threadId)];
  if (cwd) return `cd -- ${shellEscape(cwd)} && ${parts.join(" ")}`;
  return parts.join(" ");
}

export function buildResumeCommand(binary: string, cwd: string | undefined, threadId: string): string {
  return resumeCommand(binary, cwd, threadId);
}

export function escapeShell(value: string): string {
  return shellEscape(value);
}

export function escapeAppleScript(value: string): string {
  return appleScriptEscape(value);
}

async function pathExists(path: string | undefined): Promise<boolean> {
  if (!path) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function openInTerminal(cwd: string | undefined, threadId: string): Promise<boolean> {
  const binary = await resolveCodexBinary();
  if (!binary) {
    await showFailureToast(
      "Codex CLI was not found",
      "Set Codex CLI Path in extension preferences or copy the resume command.",
    );
    return false;
  }

  const workingDirectory = (await pathExists(cwd)) ? cwd : undefined;
  const command = resumeCommand(binary, workingDirectory, threadId);
  const app = getTerminalPreference();
  const escapedCommand = appleScriptEscape(command);
  const script =
    app === "iTerm"
      ? `tell application "iTerm"\n  create window with default profile\n  tell current session of current window\n    write text "${escapedCommand}"\n  end tell\nend tell`
      : `tell application "Terminal"\n  activate\n  do script "${escapedCommand}"\nend tell`;

  try {
    await runAppleScript(script);
    return true;
  } catch {
    await showFailureToast("Could not open the terminal", "Use Copy Resume Command to run the session manually.");
    return false;
  }
}

export function terminalPreference(): "Terminal" | "iTerm" {
  try {
    const value = getPreferenceValues<{ terminalApp?: "Terminal" | "iTerm" }>().terminalApp;
    return value === "iTerm" ? "iTerm" : "Terminal";
  } catch {
    return "Terminal";
  }
}
