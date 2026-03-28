import { accessSync, constants } from "node:fs";
import {
  getPeonPingStatus,
  type PeonPingConfig,
  type PeonPingNotificationPosition,
  type PeonPingNotificationStyle,
  type PeonPingPackRotationMode,
  type PeonPingStatus,
} from "./peon-ping-config";
import type { PeonPingResolvedPaths } from "./peon-ping-paths";

export type PeonPingCommandRunner = (
  command: string,
  args: readonly string[],
) => string;

export type TogglePeonPingResult = {
  message: string;
  status: PeonPingStatus;
};

function isENOENT(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function togglePeonPing(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
): TogglePeonPingResult {
  try {
    accessSync(paths.scriptPath, constants.F_OK);
  } catch (e) {
    if (isENOENT(e)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  let stdout: string;
  try {
    stdout = run("bash", [paths.scriptPath, "toggle"]);
  } catch (e) {
    if (isENOENT(e)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  return {
    message: stdout.trim(),
    status: getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  };
}

export function setVolume(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _volume: number,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setActivePack(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _packName: string,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function advanceToNextPack(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setDesktopNotifications(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setHeadphonesOnly(
  _configFilePath: string,
  _pausedFilePath: string,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setPackRotationMode(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _mode: PeonPingPackRotationMode,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setCategoryEnabled(
  _configFilePath: string,
  _pausedFilePath: string,
  _category: string,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setNotificationStyle(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _style: PeonPingNotificationStyle,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setNotificationPosition(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _position: PeonPingNotificationPosition,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setNotificationDismissTime(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _seconds: number,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export function setMobileNotifications(
  _paths: PeonPingResolvedPaths,
  _run: PeonPingCommandRunner,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}
