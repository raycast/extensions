import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { confirmAlert, environment, open } from "@raycast/api";

import { Aria2Settings } from "./types";

const POWERSHELL =
  process.env.SystemRoot !== undefined
    ? path.join(
        process.env.SystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      )
    : "powershell.exe";

export interface EngineRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export class EngineError extends Error {
  readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

export function engineScriptPath(name: string): string {
  const scriptPath = path.join(environment.assetsPath, "engine", name);
  return scriptPath;
}

async function assertEngineScript(name: string): Promise<string> {
  const scriptPath = engineScriptPath(name);
  try {
    await fs.access(scriptPath);
  } catch {
    throw new EngineError(
      `Engine asset missing: ${path.basename(scriptPath)}. Run npm run sync-engine from extension/.`,
      3,
    );
  }
  return scriptPath;
}

export async function runEngine(
  name: string,
  args: string[] = [],
  timeoutMs = 120_000,
): Promise<EngineRunResult> {
  const scriptPath = await assertEngineScript(name);
  const home = os.homedir();
  const localAppData =
    process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LOCALAPPDATA: localAppData,
    USERPROFILE: process.env.USERPROFILE || home,
    TEMP: tempDir,
    TMP: tempDir,
  };

  return new Promise((resolve, reject) => {
    execFile(
      POWERSHELL,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        ...args,
      ],
      {
        cwd: home,
        env,
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code =
          typeof error === "object" && error && "code" in error
            ? Number(error.code ?? 1)
            : 0;
        if (error && code === 0) {
          reject(error);
          return;
        }
        resolve({
          code,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
        });
      },
    );
  });
}

export async function runEngineOrThrow(
  name: string,
  args: string[] = [],
  timeoutMs = 120_000,
): Promise<EngineRunResult> {
  const result = await runEngine(name, args, timeoutMs);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new EngineError(
      detail || `${name} failed with exit code ${result.code}`,
      result.code,
    );
  }
  return result;
}

async function promptAria2Install(): Promise<void> {
  const shouldOpen = await confirmAlert({
    title: "aria2 is not installed",
    message:
      "Install aria2 first. This extension will automatically use the installed aria2c.exe; no extra setup is required.",
    primaryAction: { title: "Open aria2 Website" },
    dismissAction: { title: "Cancel" },
  });
  if (shouldOpen) {
    await open("https://aria2.github.io/");
  }
}

export async function startDaemon(): Promise<void> {
  try {
    await runEngineOrThrow("Start-Aria2Rpc.ps1", ["-NoToast"], 90_000);
  } catch (error) {
    const missingAria2 =
      error instanceof EngineError &&
      error.code === 3 &&
      /aria2c\.exe is not installed|aria2.*not installed/i.test(error.message);
    if (missingAria2) {
      await promptAria2Install();
    }
    throw error;
  }
}

export async function stopDaemon(
  options: { onlyIfIdle: boolean; force?: boolean } = { onlyIfIdle: true },
): Promise<void> {
  const args = ["-NoToast"];
  if (options.onlyIfIdle) args.push("-OnlyIfIdle");
  if (options.force) args.push("-Force");
  const result = await runEngine("Stop-Aria2Rpc.ps1", args, 90_000);
  if (result.code === 5) {
    throw new EngineError(
      "aria2 is busy: active or waiting downloads are using it.",
      5,
    );
  }
  if (result.code !== 0) {
    throw new EngineError(
      (result.stderr || result.stdout || "Stop failed").trim(),
      result.code,
    );
  }
}

export async function restartDaemon(): Promise<void> {
  await stopDaemon({ onlyIfIdle: true });
  await startDaemon();
}

export async function saveSettings(
  settings: Aria2Settings,
): Promise<{ restartRequired: boolean }> {
  const tempPath = path.join(
    os.tmpdir(),
    `aria2-raycast-settings-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  await fs.writeFile(tempPath, JSON.stringify(settings, null, 2), "utf8");

  try {
    const result = await runEngineOrThrow(
      "Set-Aria2Settings.ps1",
      ["-JsonPath", tempPath],
      60_000,
    );
    const output = result.stdout.trim();
    const lastLine = output.split(/\r?\n/).filter(Boolean).pop();
    if (!lastLine) return { restartRequired: true };
    try {
      const parsed = JSON.parse(lastLine) as { restartRequired?: boolean };
      return { restartRequired: parsed.restartRequired !== false };
    } catch {
      return { restartRequired: true };
    }
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function simulateRun(
  name: string,
  args: string[] = [],
): Promise<EngineRunResult> {
  return runEngine(name, [...args, "-DryRun"], 60_000);
}
