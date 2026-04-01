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
import type {
  PeonPingCommandPaths,
  PeonPingCommandTarget,
} from "./peon-ping-command-target";

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

function getCommandTarget(paths: PeonPingCommandPaths): PeonPingCommandTarget {
  return (
    paths.commandTarget ?? {
      source: "script",
      command: "bash",
      executablePath: paths.scriptPath,
      argsPrefix: [paths.scriptPath],
    }
  );
}

function getInstallLocation(paths: PeonPingCommandPaths): string {
  return getCommandTarget(paths).executablePath;
}

function ensureCommandAvailable(paths: PeonPingCommandPaths): void {
  try {
    accessSync(getInstallLocation(paths), constants.F_OK);
  } catch (e) {
    if (isENOENT(e as NodeJS.ErrnoException)) {
      throw new Error(
        `peon-ping is not installed at ${getInstallLocation(paths)}`,
      );
    }
    throw e;
  }
}

function runPeonCommand(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  args: readonly string[],
): string {
  const commandTarget = getCommandTarget(paths);
  try {
    return run(commandTarget.command, [...commandTarget.argsPrefix, ...args]);
  } catch (e) {
    if (isENOENT(e as NodeJS.ErrnoException)) {
      throw new Error(
        `peon-ping is not installed at ${getInstallLocation(paths)}`,
      );
    }
    throw e;
  }
}

export function togglePeonPing(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
): TogglePeonPingResult {
  ensureCommandAvailable(paths);
  const stdout = runPeonCommand(paths, run, ["toggle"]);
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
  const existing = readFileSync(configFilePath, "utf-8");
  const indent = existing.match(/\n([ \t]+)/)?.[1];
  writeFileSync(configFilePath, JSON.stringify(config, null, indent), "utf-8");
}

function updateRawConfig(
  configFilePath: string,
  pausedFilePath: string,
  update: (config: RawPeonPingConfig) => void,
): PeonPingConfig {
  const config = readRawConfig(configFilePath);
  update(config);
  writeRawConfig(configFilePath, config);
  return getPeonPingConfig(configFilePath, pausedFilePath);
}

export function setVolume(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  volume: number,
): PeonPingConfig {
  runPeonCommand(paths, run, ["volume", String(volume)]);
  return refreshConfig(paths);
}

export function setActivePack(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  packName: string,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "use", packName]);
  return refreshConfig(paths);
}

export function advanceToNextPack(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "next"]);
  return refreshConfig(paths);
}

export function setDesktopNotifications(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  runPeonCommand(paths, run, ["notifications", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}

export function setHeadphonesOnly(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    config.headphones_only = enabled;
  });
}

export function setUseSoundEffectsDevice(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    config.use_sound_effects_device = enabled;
  });
}

export function setPackRotationMode(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  mode: PeonPingPackRotationMode,
): PeonPingConfig {
  runPeonCommand(paths, run, ["rotation", mode]);
  return refreshConfig(paths);
}

export function addPackToRotation(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  packName: string,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "rotation", "add", packName]);
  return refreshConfig(paths);
}

export function removePackFromRotation(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  packName: string,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "rotation", "remove", packName]);
  return refreshConfig(paths);
}

export function clearPackRotation(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "rotation", "clear"]);
  return refreshConfig(paths);
}

export function removePathRule(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  pattern: string,
): PeonPingConfig {
  runPeonCommand(paths, run, ["packs", "unbind", "--pattern", pattern]);
  return refreshConfig(paths);
}

export function setDebugEnabled(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  runPeonCommand(paths, run, ["debug", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}

export function setTrainerEnabled(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  runPeonCommand(paths, run, ["trainer", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}

export function setCategoryEnabled(
  configFilePath: string,
  pausedFilePath: string,
  category: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    if (!config.categories) {
      config.categories = {};
    }
    (config.categories as Record<string, boolean>)[category] = enabled;
  });
}

export function setNotificationStyle(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  style: PeonPingNotificationStyle,
): PeonPingConfig {
  runPeonCommand(paths, run, ["notifications", style]);
  return refreshConfig(paths);
}

export function setNotificationPosition(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  position: PeonPingNotificationPosition,
): PeonPingConfig {
  runPeonCommand(paths, run, ["notifications", "position", position]);
  return refreshConfig(paths);
}

export function setNotificationDismissTime(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  seconds: number,
): PeonPingConfig {
  runPeonCommand(paths, run, ["notifications", "dismiss", String(seconds)]);
  return refreshConfig(paths);
}

export function setMobileNotifications(
  paths: PeonPingCommandPaths,
  run: PeonPingCommandRunner,
  enabled: boolean,
): PeonPingConfig {
  runPeonCommand(paths, run, ["mobile", enabled ? "on" : "off"]);
  return refreshConfig(paths);
}

export function setNotificationAllScreens(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    config.notification_all_screens = enabled;
  });
}

export function setMeetingDetect(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    config.meeting_detect = enabled;
  });
}

export function setSuppressSubagentComplete(
  configFilePath: string,
  pausedFilePath: string,
  enabled: boolean,
): PeonPingConfig {
  return updateRawConfig(configFilePath, pausedFilePath, (config) => {
    config.suppress_subagent_complete = enabled;
  });
}
