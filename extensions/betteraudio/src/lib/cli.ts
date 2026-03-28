import { execFile } from "node:child_process";
import type { ExecFileException } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { getPreferenceValues } from "@raycast/api";
import { CLI_PATHS, CLI_TIMEOUT } from "./constants";
import type {
  CLIResponse,
  CLIAppInfo,
  CLIBluetoothInfo,
  CLIDeviceInfo,
  CLIEQInfo,
  CLIMediaInfo,
  CLIProfileInfo,
  CLIStatusInfo,
  CLIVersionInfo,
} from "./types";
import {
  extractVolume,
  extractMuted,
  extractSilentMode,
  extractDevice,
  extractDevices,
  extractApps,
  extractProfiles,
  extractMediaInfo,
  extractBluetooth,
  extractStatus,
  extractVersion,
  extractEQ,
  extractText,
} from "./types";

export class CLINotFoundError extends Error {
  constructor() {
    super(
      "BetterAudio CLI not found. Install it via BetterAudio → Settings → CLI, or set a custom path in the extension preferences.",
    );
    this.name = "CLINotFoundError";
  }
}

export class AppNotRunningError extends Error {
  constructor(detail?: string) {
    super(detail ?? "BetterAudio is not running. Please launch the app first.");
    this.name = "AppNotRunningError";
  }
}

export class CLICommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CLICommandError";
  }
}

let resolvedPath: string | null = null;

async function resolveCLIPath(): Promise<string> {
  if (resolvedPath) return resolvedPath;

  const prefs = getPreferenceValues<{ cliPath?: string }>();
  if (prefs.cliPath) {
    try {
      await access(prefs.cliPath, constants.X_OK);
      resolvedPath = prefs.cliPath;
      return prefs.cliPath;
    } catch {
      throw new CLINotFoundError();
    }
  }

  for (const p of CLI_PATHS) {
    try {
      await access(p, constants.X_OK);
      resolvedPath = p;
      return resolvedPath;
    } catch {
      // Ignore missing/non-executable candidates and keep searching.
    }
  }

  throw new CLINotFoundError();
}

export async function runCLI(args: string[]): Promise<CLIResponse> {
  const cliPath = await resolveCLIPath();

  return new Promise((resolve, reject) => {
    execFile(
      cliPath,
      [...args, "--json"],
      { timeout: CLI_TIMEOUT },
      (error: ExecFileException | null, stdout: string, stderr: string) => {
        if (error) {
          const msg = stderr?.trim() || error.message;

          if (
            msg.includes("not running") ||
            msg.includes("Connection refused") ||
            msg.includes("appNotRunning") ||
            msg.includes("No such file or directory")
          ) {
            reject(new AppNotRunningError(msg));
            return;
          }

          reject(new CLICommandError(msg));
          return;
        }

        try {
          const response = JSON.parse(stdout) as CLIResponse;
          if (!response.success && response.error) {
            reject(new CLICommandError(response.error));
            return;
          }
          resolve(response);
        } catch {
          reject(
            new CLICommandError(
              `Failed to parse CLI output: ${stdout.slice(0, 200)}`,
            ),
          );
        }
      },
    );
  });
}

export async function getVolume(): Promise<number> {
  const res = await runCLI(["volume", "get"]);
  return extractVolume(res.data) ?? 0;
}

export async function setVolume(level: number): Promise<number> {
  const res = await runCLI(["volume", "set", String(Math.round(level))]);
  return extractVolume(res.data) ?? level;
}

export async function volumeUp(): Promise<number> {
  const res = await runCLI(["volume", "up"]);
  return extractVolume(res.data) ?? 0;
}

export async function volumeDown(): Promise<number> {
  const res = await runCLI(["volume", "down"]);
  return extractVolume(res.data) ?? 0;
}

export async function getMute(): Promise<boolean> {
  const res = await runCLI(["mute", "get"]);
  return extractMuted(res.data) ?? false;
}

export async function setMute(
  action: "on" | "off" | "toggle",
): Promise<boolean> {
  const res = await runCLI(["mute", action]);
  return extractMuted(res.data) ?? false;
}

export async function getSilentMode(): Promise<boolean> {
  const res = await runCLI(["silent-mode", "get"]);
  return extractSilentMode(res.data) ?? false;
}

export async function toggleSilentMode(): Promise<boolean> {
  const res = await runCLI(["silent-mode", "toggle"]);
  return extractSilentMode(res.data) ?? false;
}

export async function listDevices(
  direction?: "input" | "output",
): Promise<CLIDeviceInfo[]> {
  const args = ["device", "list"];
  if (direction) args.push("-d", direction);
  const res = await runCLI(args);
  return extractDevices(res.data) ?? [];
}

export async function getCurrentDevice(
  direction: "input" | "output",
): Promise<CLIDeviceInfo | undefined> {
  const res = await runCLI(["device", "current", direction]);
  return extractDevice(res.data);
}

export async function setDevice(
  uid: string,
  direction?: "input" | "output",
): Promise<string> {
  const args = ["device", "set", uid];
  if (direction) args.push("-d", direction);
  const res = await runCLI(args);
  return res.message ?? `Device set to ${uid}`;
}

export async function cycleDevice(
  direction: "input" | "output" = "output",
): Promise<string> {
  const res = await runCLI(["device", "cycle", direction]);
  return res.message ?? "Cycled device";
}

export async function listApps(): Promise<CLIAppInfo[]> {
  const res = await runCLI(["app", "list"]);
  return extractApps(res.data) ?? [];
}

export async function getAppVolume(app: string): Promise<number> {
  const res = await runCLI(["app", "volume", app]);
  return extractVolume(res.data) ?? 0;
}

export async function setAppVolume(
  app: string,
  level: number,
): Promise<number> {
  const res = await runCLI(["app", "volume", app, String(Math.round(level))]);
  return extractVolume(res.data) ?? level;
}

export async function muteApp(
  app: string,
  action: "on" | "off" | "toggle" = "toggle",
): Promise<boolean> {
  const res = await runCLI(["app", "mute", app, action]);
  return extractMuted(res.data) ?? false;
}

export async function soloApp(app: string): Promise<string> {
  const res = await runCLI(["app", "solo", app]);
  return res.message ?? `Solo: ${app}`;
}

export async function getAppEQ(app: string): Promise<CLIEQInfo | undefined> {
  const res = await runCLI(["app", "eq", "get", app]);
  return extractEQ(res.data);
}

export async function setAppEQ(app: string, preset: string): Promise<string> {
  const res = await runCLI(["app", "eq", "set", app, preset]);
  return res.message ?? `EQ set to ${preset}`;
}

export async function getAppDevice(app: string): Promise<string> {
  const res = await runCLI(["app", "device", "get", app]);
  return extractText(res.data) ?? "default";
}

export async function setAppDevice(
  app: string,
  deviceUID: string,
): Promise<string> {
  const res = await runCLI(["app", "device", "set", app, deviceUID]);
  return res.message ?? `Routed to ${deviceUID}`;
}

export async function listProfiles(): Promise<CLIProfileInfo[]> {
  const res = await runCLI(["profile", "list"]);
  return extractProfiles(res.data) ?? [];
}

export async function applyProfile(name: string): Promise<string> {
  const res = await runCLI(["profile", "apply", name]);
  return res.message ?? `Applied profile: ${name}`;
}

export async function mediaPlayPause(): Promise<string> {
  const res = await runCLI(["media", "play-pause"]);
  return res.message ?? "Play/Pause toggled";
}

export async function mediaNext(): Promise<string> {
  const res = await runCLI(["media", "next"]);
  return res.message ?? "Next track";
}

export async function mediaPrevious(): Promise<string> {
  const res = await runCLI(["media", "previous"]);
  return res.message ?? "Previous track";
}

export async function mediaForward(seconds = 15): Promise<string> {
  const res = await runCLI(["media", "forward", String(seconds)]);
  return res.message ?? `Skipped forward ${seconds}s`;
}

export async function mediaBackward(seconds = 15): Promise<string> {
  const res = await runCLI(["media", "backward", String(seconds)]);
  return res.message ?? `Skipped backward ${seconds}s`;
}

export async function mediaShuffle(): Promise<string> {
  const res = await runCLI(["media", "shuffle"]);
  return res.message ?? "Shuffle toggled";
}

export async function mediaRepeat(): Promise<string> {
  const res = await runCLI(["media", "repeat"]);
  return res.message ?? "Repeat toggled";
}

export async function getMediaVolume(): Promise<number> {
  const res = await runCLI(["media", "volume"]);
  return extractVolume(res.data) ?? 0;
}

export async function setMediaVolume(level: number): Promise<number> {
  const res = await runCLI(["media", "volume", String(Math.round(level))]);
  return extractVolume(res.data) ?? level;
}

export async function getMediaInfo(): Promise<CLIMediaInfo | undefined> {
  const res = await runCLI(["media", "info"]);
  return extractMediaInfo(res.data);
}

export async function listBluetooth(): Promise<CLIBluetoothInfo[]> {
  const res = await runCLI(["bluetooth", "list"]);
  return extractBluetooth(res.data) ?? [];
}

export async function togglePanel(): Promise<string> {
  const res = await runCLI(["panel", "toggle"]);
  return res.message ?? "Panel toggled";
}

export async function getStatus(): Promise<CLIStatusInfo | undefined> {
  const res = await runCLI(["status"]);
  return extractStatus(res.data);
}

export async function getVersion(): Promise<CLIVersionInfo | undefined> {
  const res = await runCLI(["version"]);
  return extractVersion(res.data);
}
