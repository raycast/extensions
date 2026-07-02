import { open, getApplications } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
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
    await openWithFlag("-new-window", target.url);
    return;
  }
  if (options?.forceNewTab) {
    await openWithFlag("-new-tab", target.url);
    return;
  }
  try {
    await open(target.url, FIREFOX_APP_NAME);
  } catch {
    await openWithFlag("-new-tab", target.url);
  }
}

async function resolveFirefoxExecutable(): Promise<string | null> {
  try {
    const apps = await getApplications();
    const firefox = apps.find((a) => a.name.toLowerCase().includes("firefox") && a.path.toLowerCase().endsWith(".exe"));
    if (firefox) return firefox.path;
  } catch {
    // fall through to heuristic paths
  }

  const candidates = [
    process.env["PROGRAMFILES"] && path.join(process.env["PROGRAMFILES"], "Mozilla Firefox", "firefox.exe"),
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Mozilla Firefox", "firefox.exe"),
    process.env["LOCALAPPDATA"] && path.join(process.env["LOCALAPPDATA"], "Mozilla Firefox", "firefox.exe"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

async function openWithFlag(flag: "-new-window" | "-new-tab", url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) {
    await open(url, FIREFOX_APP_NAME);
    return;
  }
  const executable = await resolveFirefoxExecutable();
  if (executable) {
    spawn(executable, [flag, url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  const escapedUrl = escapePowerShellArg(url);
  await runPowerShell(`Start-Process firefox -ArgumentList '${flag}', ${escapedUrl}`);
}
