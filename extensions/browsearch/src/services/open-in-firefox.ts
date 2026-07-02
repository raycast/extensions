import { open, getApplications } from "@raycast/api";
import type { OpenTarget } from "../types";
import { FIREFOX_APP_NAME } from "../constants";
import { escapePowerShellArg, runPowerShell } from "../utils/windows/powershell";

interface OpenInFirefoxOptions {
  readonly forceNewTab?: boolean;
  readonly forceNewWindow?: boolean;
}

export async function isFirefoxAvailable(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.name.toLowerCase().includes("firefox"));
}

export async function openInFirefox(target: OpenTarget, options?: OpenInFirefoxOptions): Promise<void> {
  if (options?.forceNewWindow) {
    await openViaNewWindow(target.url);
    return;
  }
  if (options?.forceNewTab) {
    await openViaNewTab(target.url);
    return;
  }
  try {
    await open(target.url, FIREFOX_APP_NAME);
  } catch {
    await openViaNewTab(target.url);
  }
}

async function openViaNewTab(url: string): Promise<void> {
  const escapedUrl = escapePowerShellArg(url);
  await runPowerShell(`Start-Process firefox -ArgumentList '-new-tab', ${escapedUrl}`);
}

async function openViaNewWindow(url: string): Promise<void> {
  const escapedUrl = escapePowerShellArg(url);
  await runPowerShell(`Start-Process firefox -ArgumentList '-new-window', ${escapedUrl}`);
}
