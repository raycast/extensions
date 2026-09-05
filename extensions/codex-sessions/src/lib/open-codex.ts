import { getApplications, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { resolveCodexBinary } from "./codex-paths";

const execFile = promisify(execFileCallback);
const codexBundleId = "com.openai.codex";

export type NewTaskTarget = { path: string; originUrl?: never } | { path?: never; originUrl: string };

export function threadDeepLink(id: string): string {
  return `codex://threads/${encodeURIComponent(id)}`;
}

export function newTaskDeepLink(target: NewTaskTarget): string {
  if ((!target.path && !target.originUrl) || (target.path && target.originUrl)) {
    throw new Error("Exactly one path or origin URL is required");
  }
  const params = new URLSearchParams();
  if (target.path) params.set("path", target.path);
  if (target.originUrl) params.set("originUrl", target.originUrl);
  return `codex://new?${params.toString()}`;
}

export async function isCodexDesktopInstalled(): Promise<boolean> {
  try {
    const applications = await getApplications();
    return applications.some((application) => application.bundleId === codexBundleId);
  } catch {
    return false;
  }
}

export async function openDeepLink(url: string): Promise<boolean> {
  try {
    await open(url);
    await execFile("/usr/bin/open", ["-b", codexBundleId]);
    return true;
  } catch {
    await showFailureToast(
      "Could not open Codex Desktop",
      "Check that Codex Desktop is installed or use Resume in Terminal.",
    );
    return false;
  }
}

export async function openWorkspaceViaCli(path: string): Promise<boolean> {
  const binary = await resolveCodexBinary();
  if (!binary) {
    await showFailureToast("Codex CLI was not found", "Set Codex CLI Path in extension preferences.");
    return false;
  }
  try {
    await execFile(binary, ["app", path]);
    return true;
  } catch {
    await showFailureToast("Could not open the workspace", "Check the Codex CLI path in extension preferences.");
    return false;
  }
}

export async function openThread(id: string): Promise<boolean> {
  if (await isCodexDesktopInstalled()) {
    return openDeepLink(threadDeepLink(id));
  }
  await showFailureToast("Codex Desktop is not installed", "Use Resume in Terminal or Copy Resume Command.");
  return false;
}

export async function openWorkspace(path: string): Promise<boolean> {
  if (await isCodexDesktopInstalled()) {
    return openDeepLink(newTaskDeepLink({ path }));
  }
  return openWorkspaceViaCli(path);
}

export async function showFailureToast(title: string, message: string): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title, message });
}

export function getTerminalPreference(): "Terminal" | "iTerm" {
  try {
    const preferences = getPreferenceValues<{ terminalApp?: "Terminal" | "iTerm" }>();
    return preferences.terminalApp === "iTerm" ? "iTerm" : "Terminal";
  } catch {
    return "Terminal";
  }
}
