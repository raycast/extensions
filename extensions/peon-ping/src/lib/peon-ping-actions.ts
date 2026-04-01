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
  removePathRule,
  removePackFromRotation,
  setPathRulePack,
  setSessionStartCooldownSeconds,
  setSilentWindowSeconds,
  setActivePack,
  setDebugEnabled,
  setCategoryEnabled,
  setDesktopNotifications,
  setHeadphonesOnly,
  setMeetingDetect,
  setMobileNotifications,
  setNotificationAllScreens,
  setNotificationDismissTime,
  setNotificationPosition,
  setNotificationStyle,
  setPackRotationMode,
  setSuppressSubagentComplete,
  setTrainerEnabled,
  setTrainerExerciseGoal,
  setTrainerReminderIntervalMinutes,
  setTrainerReminderMinGapMinutes,
  setUseSoundEffectsDevice,
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

export type RunToggleUseSoundEffectsDeviceActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setUseSoundEffectsDevice: typeof setUseSoundEffectsDevice;
  setConfig: SetConfig;
};

export function runToggleUseSoundEffectsDeviceAction(
  deps: RunToggleUseSoundEffectsDeviceActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setUseSoundEffectsDevice(
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

export type RunRemovePathRuleActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  removePathRule: typeof removePathRule;
  setConfig: SetConfig;
};

export function runRemovePathRuleAction(
  deps: RunRemovePathRuleActionDeps,
  pattern: string,
): PeonPingConfig {
  const config = deps.removePathRule(deps.paths, deps.run, pattern);
  deps.setConfig(config);
  return config;
}

export type RunSetPathRulePackActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setPathRulePack: typeof setPathRulePack;
  setConfig: SetConfig;
};

export function runSetPathRulePackAction(
  deps: RunSetPathRulePackActionDeps,
  pattern: string,
  packName: string,
): PeonPingConfig {
  const config = deps.setPathRulePack(deps.paths, deps.run, pattern, packName);
  deps.setConfig(config);
  return config;
}

export type RunSetDebugEnabledActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setDebugEnabled: typeof setDebugEnabled;
  setConfig: SetConfig;
};

export function runSetDebugEnabledAction(
  deps: RunSetDebugEnabledActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setDebugEnabled(deps.paths, deps.run, enabled);
  deps.setConfig(config);
  return config;
}

export type RunSetTrainerEnabledActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setTrainerEnabled: typeof setTrainerEnabled;
  setConfig: SetConfig;
};

export function runSetTrainerEnabledAction(
  deps: RunSetTrainerEnabledActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setTrainerEnabled(deps.paths, deps.run, enabled);
  deps.setConfig(config);
  return config;
}

export type RunSetTrainerExerciseGoalActionDeps = {
  paths: PeonPingCommandPaths;
  run: PeonPingCommandRunner;
  setTrainerExerciseGoal: typeof setTrainerExerciseGoal;
  setConfig: SetConfig;
};

export function runSetTrainerExerciseGoalAction(
  deps: RunSetTrainerExerciseGoalActionDeps,
  exercise: string,
  goal: number,
): PeonPingConfig {
  const config = deps.setTrainerExerciseGoal(
    deps.paths,
    deps.run,
    exercise,
    goal,
  );
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

export type RunToggleNotificationAllScreensActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setNotificationAllScreens: typeof setNotificationAllScreens;
  setConfig: SetConfig;
};

export function runToggleNotificationAllScreensAction(
  deps: RunToggleNotificationAllScreensActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setNotificationAllScreens(
    deps.configFilePath,
    deps.pausedFilePath,
    enabled,
  );
  deps.setConfig(config);
  return config;
}

export type RunToggleMeetingDetectActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setMeetingDetect: typeof setMeetingDetect;
  setConfig: SetConfig;
};

export function runToggleMeetingDetectAction(
  deps: RunToggleMeetingDetectActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setMeetingDetect(
    deps.configFilePath,
    deps.pausedFilePath,
    enabled,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetSilentWindowSecondsActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setSilentWindowSeconds: typeof setSilentWindowSeconds;
  setConfig: SetConfig;
};

export function runSetSilentWindowSecondsAction(
  deps: RunSetSilentWindowSecondsActionDeps,
  seconds: number,
): PeonPingConfig {
  const config = deps.setSilentWindowSeconds(
    deps.configFilePath,
    deps.pausedFilePath,
    seconds,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetSessionStartCooldownSecondsActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setSessionStartCooldownSeconds: typeof setSessionStartCooldownSeconds;
  setConfig: SetConfig;
};

export function runSetSessionStartCooldownSecondsAction(
  deps: RunSetSessionStartCooldownSecondsActionDeps,
  seconds: number,
): PeonPingConfig {
  const config = deps.setSessionStartCooldownSeconds(
    deps.configFilePath,
    deps.pausedFilePath,
    seconds,
  );
  deps.setConfig(config);
  return config;
}

export type RunToggleSuppressSubagentCompleteActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setSuppressSubagentComplete: typeof setSuppressSubagentComplete;
  setConfig: SetConfig;
};

export function runToggleSuppressSubagentCompleteAction(
  deps: RunToggleSuppressSubagentCompleteActionDeps,
  enabled: boolean,
): PeonPingConfig {
  const config = deps.setSuppressSubagentComplete(
    deps.configFilePath,
    deps.pausedFilePath,
    enabled,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetTrainerReminderIntervalMinutesActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setTrainerReminderIntervalMinutes: typeof setTrainerReminderIntervalMinutes;
  setConfig: SetConfig;
};

export function runSetTrainerReminderIntervalMinutesAction(
  deps: RunSetTrainerReminderIntervalMinutesActionDeps,
  minutes: number,
): PeonPingConfig {
  const config = deps.setTrainerReminderIntervalMinutes(
    deps.configFilePath,
    deps.pausedFilePath,
    minutes,
  );
  deps.setConfig(config);
  return config;
}

export type RunSetTrainerReminderMinGapMinutesActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setTrainerReminderMinGapMinutes: typeof setTrainerReminderMinGapMinutes;
  setConfig: SetConfig;
};

export function runSetTrainerReminderMinGapMinutesAction(
  deps: RunSetTrainerReminderMinGapMinutesActionDeps,
  minutes: number,
): PeonPingConfig {
  const config = deps.setTrainerReminderMinGapMinutes(
    deps.configFilePath,
    deps.pausedFilePath,
    minutes,
  );
  deps.setConfig(config);
  return config;
}
