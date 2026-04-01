import { Toast } from "@raycast/api";
import type {
  PeonPingConfig,
  PeonPingNotificationPosition,
  PeonPingNotificationStyle,
  PeonPingPackRotationMode,
  PeonPingStatus,
} from "./peon-ping-config";
import type { PeonPingCommandPaths } from "./peon-ping-command-target";
import {
  addPackToRotation,
  advanceToNextPack,
  clearPackRotation,
  removePackFromRotation,
  setActivePack,
  setCategoryEnabled,
  setDesktopNotifications,
  setHeadphonesOnly,
  setMobileNotifications,
  setNotificationDismissTime,
  setNotificationPosition,
  setNotificationStyle,
  setPackRotationMode,
  setVolume,
  togglePeonPing,
  type PeonPingCommandRunner,
  type TogglePeonPingResult,
} from "./peon-ping-service";
import type { RefreshMenuBarDeps } from "./refresh-menu-bar";
import { refreshMenuBarCommand } from "./refresh-menu-bar";

type SetConfig = (config: PeonPingConfig) => void;
type ErrorWithMessage = { message: string };
type ThrownValue =
  | Error
  | ErrorWithMessage
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

const STATUS_TOGGLE_FAILURE_TITLE = "Failed to update Peon Ping";

export type RunToggleActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  togglePeonPing: typeof togglePeonPing;
  setStatus: (status: PeonPingStatus) => void;
};

export function runToggleAction(
  deps: RunToggleActionDeps,
): TogglePeonPingResult {
  const result = deps.togglePeonPing(deps.paths, deps.run);
  deps.setStatus(result.status);
  return result;
}

export async function runStatusToggleAndRefreshMenuBar(
  toggleDeps: RunToggleActionDeps,
  refreshDeps: RefreshMenuBarDeps,
): Promise<void> {
  runToggleAction(toggleDeps);
  await refreshMenuBarCommand(refreshDeps);
}

export type ShowToastDeps = {
  showToast: (options: {
    style: Toast.Style;
    title: string;
    message?: string;
  }) => Promise<Toast>;
};

function getThrownMessage(error: ThrownValue): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint" ||
    typeof error === "symbol"
  ) {
    return String(error);
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return undefined;
}

function showStatusToggleFailureToast(
  toastDeps: ShowToastDeps,
  error: ThrownValue,
): void {
  const toastPromise = toastDeps.showToast({
    style: Toast.Style.Failure,
    title: STATUS_TOGGLE_FAILURE_TITLE,
    message: getThrownMessage(error),
  });
  void toastPromise.then(
    () => undefined,
    () => undefined,
  );
}

export function runStatusToggleAndRefreshMenuBarSafely(
  toggleDeps: RunToggleActionDeps,
  refreshDeps: RefreshMenuBarDeps,
  toastDeps: ShowToastDeps,
): void {
  const refreshPromise = runStatusToggleAndRefreshMenuBar(
    toggleDeps,
    refreshDeps,
  );
  void refreshPromise.then(
    () => undefined,
    (error: ThrownValue) => {
      showStatusToggleFailureToast(toastDeps, error);
    },
  );
}

export type RunSetVolumeActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setVolume: typeof setVolume;
  setConfig: SetConfig;
};

export function runSetVolumeAction(
  deps: RunSetVolumeActionDeps,
  volume: number,
): PeonPingConfig {
  const config = deps.setVolume(deps.paths, deps.run, volume);
  deps.setConfig(config);
  return config;
}

export type RunSetActivePackActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setActivePack: typeof setActivePack;
  setConfig: SetConfig;
};

export function runSetActivePackAction(
  deps: RunSetActivePackActionDeps,
  packName: string,
): PeonPingConfig {
  const config = deps.setActivePack(deps.paths, deps.run, packName);
  deps.setConfig(config);
  return config;
}

export type RunNextPackActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  advanceToNextPack: typeof advanceToNextPack;
  setConfig: SetConfig;
};

export function runNextPackAction(deps: RunNextPackActionDeps): PeonPingConfig {
  const config = deps.advanceToNextPack(deps.paths, deps.run);
  deps.setConfig(config);
  return config;
}

export type RunToggleNotificationsActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setDesktopNotifications: typeof setDesktopNotifications;
  setConfig: SetConfig;
};

export function runToggleNotificationsAction(
  deps: RunToggleNotificationsActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setDesktopNotifications(deps.paths, deps.run, enabled);
  deps.setConfig(config);
  return config;
}

export type RunToggleHeadphonesOnlyActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setHeadphonesOnly: typeof setHeadphonesOnly;
  setConfig: SetConfig;
};

export function runToggleHeadphonesOnlyAction(
  deps: RunToggleHeadphonesOnlyActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setHeadphonesOnly(
    deps.configFilePath,
    deps.pausedFilePath,
    enabled,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetRotationModeActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setPackRotationMode: typeof setPackRotationMode;
  setConfig: SetConfig;
};

export function runSetRotationModeAction(
  deps: RunSetRotationModeActionDeps,
  mode: PeonPingPackRotationMode,
): PeonPingConfig {
  const config = deps.setPackRotationMode(deps.paths, deps.run, mode);
  deps.setConfig(config);
  return config;
}

export type RunAddPackToRotationActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  addPackToRotation: typeof addPackToRotation;
  setConfig: SetConfig;
};

export function runAddPackToRotationAction(
  deps: RunAddPackToRotationActionDeps,
  packName: string,
): PeonPingConfig {
  const config = deps.addPackToRotation(deps.paths, deps.run, packName);
  deps.setConfig(config);
  return config;
}

export type RunRemovePackFromRotationActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  removePackFromRotation: typeof removePackFromRotation;
  setConfig: SetConfig;
};

export function runRemovePackFromRotationAction(
  deps: RunRemovePackFromRotationActionDeps,
  packName: string,
): PeonPingConfig {
  const config = deps.removePackFromRotation(deps.paths, deps.run, packName);
  deps.setConfig(config);
  return config;
}

export type RunClearPackRotationActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  clearPackRotation: typeof clearPackRotation;
  setConfig: SetConfig;
};

export function runClearPackRotationAction(
  deps: RunClearPackRotationActionDeps,
): PeonPingConfig {
  const config = deps.clearPackRotation(deps.paths, deps.run);
  deps.setConfig(config);
  return config;
}

export type RunToggleCategoryActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setCategoryEnabled: typeof setCategoryEnabled;
  setConfig: SetConfig;
};

export function runToggleCategoryAction(
  deps: RunToggleCategoryActionDeps,
  category: string,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setCategoryEnabled(
    deps.configFilePath,
    deps.pausedFilePath,
    category,
    enabled,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetNotificationStyleActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setNotificationStyle: typeof setNotificationStyle;
  setConfig: SetConfig;
};

export function runSetNotificationStyleAction(
  deps: RunSetNotificationStyleActionDeps,
  style: PeonPingNotificationStyle,
): PeonPingConfig {
  const config = deps.setNotificationStyle(deps.paths, deps.run, style);
  deps.setConfig(config);
  return config;
}

export type RunSetNotificationPositionActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setNotificationPosition: typeof setNotificationPosition;
  setConfig: SetConfig;
};

export function runSetNotificationPositionAction(
  deps: RunSetNotificationPositionActionDeps,
  position: PeonPingNotificationPosition,
): PeonPingConfig {
  const config = deps.setNotificationPosition(deps.paths, deps.run, position);
  deps.setConfig(config);
  return config;
}

export type RunSetDismissTimeActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setNotificationDismissTime: typeof setNotificationDismissTime;
  setConfig: SetConfig;
};

export function runSetDismissTimeAction(
  deps: RunSetDismissTimeActionDeps,
  seconds: number,
): PeonPingConfig {
  const config = deps.setNotificationDismissTime(deps.paths, deps.run, seconds);
  deps.setConfig(config);
  return config;
}

export type RunToggleMobileActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setMobileNotifications: typeof setMobileNotifications;
  setConfig: SetConfig;
};

export function runToggleMobileAction(
  deps: RunToggleMobileActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setMobileNotifications(deps.paths, deps.run, enabled);
  deps.setConfig(config);
  return config;
}
