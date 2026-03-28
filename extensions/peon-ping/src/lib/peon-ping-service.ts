import { accessSync, constants, readFileSync, writeFileSync } from "node:fs";
import {
  getPeonPingConfig,
  getPeonPingStatus,
  type PeonPingConfig,
  type PeonPingNotificationPosition,
  type PeonPingNotificationStyle,
  type PeonPingPackRotationMode,
  type PeonPingStatus,
  type RawPeonPingConfig,
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

function isENOENT(e: NodeJS.ErrnoException): boolean {
  return e.code === "ENOENT";
}

export function togglePeonPing(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
): TogglePeonPingResult {
  try {
    accessSync(paths.scriptPath, constants.F_OK);
  } catch (e) {
    if (isENOENT(e as NodeJS.ErrnoException)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  let stdout: string;
  try {
    stdout = run("bash", [paths.scriptPath, "toggle"]);
  } catch (e) {
    if (isENOENT(e as NodeJS.ErrnoException)) {
      throw new Error(`peon-ping is not installed at ${paths.scriptPath}`);
    }
    throw e;
  }
  return {
    message: stdout.trim(),
    status: getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  };
}

function refreshConfig(paths: PeonPingResolvedPaths): PeonPingConfig {
  return getPeonPingConfig(paths.configFilePath, paths.pausedFilePath);
}

function readRawConfig(configFilePath: string): RawPeonPingConfig {
  return JSON.parse(readFileSync(configFilePath, "utf8")) as RawPeonPingConfig;
}

function writeRawConfig(
  configFilePath: string,
  config: RawPeonPingConfig,
): void {
  writeFileSync(configFilePath, JSON.stringify(config), "utf-8");
}

export function setVolume(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  volume: number,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "volume", String(volume)]);
  return refreshConfig(paths);
}

export function setActivePack(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  packName: string,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "packs", "use", packName]);
  return refreshConfig(paths);
}

export function advanceToNextPack(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "packs", "next"]);
  return refreshConfig(paths);
}

export function setDesktopNotifications(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "notifications", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}

export function setHeadphonesOnly(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  const config = readRawConfig(configFilePath);
  config.headphones_only = enabled;
  writeRawConfig(configFilePath, config);
  return getPeonPingConfig(configFilePath, pausedFilePath);
}

export function setPackRotationMode(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  mode: PeonPingPackRotationMode,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "rotation", mode]);
  return refreshConfig(paths);
}

export function setCategoryEnabled(
  configFilePath: string,
  pausedFilePath: string,
  category: string,
  enabled: boolean,
): PeonPingConfig {
  const config = readRawConfig(configFilePath);
  if (!config.categories) {
    config.categories = {};
  }
  (config.categories as Record<string, boolean>)[category] = enabled;
  writeRawConfig(configFilePath, config);
  return getPeonPingConfig(configFilePath, pausedFilePath);
}

export function setNotificationStyle(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  style: PeonPingNotificationStyle,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "notifications", style]);
  return refreshConfig(paths);
}

export function setNotificationPosition(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  position: PeonPingNotificationPosition,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "notifications", "position", position]);
  return refreshConfig(paths);
}

export function setNotificationDismissTime(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  seconds: number,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "notifications", "dismiss", String(seconds)]);
  return refreshConfig(paths);
}

export function setMobileNotifications(
  paths: PeonPingResolvedPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  run("bash", [paths.scriptPath, "mobile", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}
