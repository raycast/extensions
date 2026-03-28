import { MenuBarExtra } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { useState } from "react";
import {
  getPeonPingStatus,
  type PeonPingConfig,
  type PeonPingNotificationPosition,
  type PeonPingNotificationStyle,
  type PeonPingPackRotationMode,
  type PeonPingStatus,
} from "./lib/peon-ping-config";
import { getMenuBarPresentation } from "./lib/menu-bar-presentation";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import {
  resolvePeonPingPaths,
  type PeonPingResolvedPaths,
} from "./lib/peon-ping-paths";
import {
  advanceToNextPack,
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
} from "./lib/peon-ping-service";

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

export type RunMenuBarToggleActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  togglePeonPing: typeof togglePeonPing;
  setStatus: (status: PeonPingStatus) => void;
};

export function runMenuBarToggleAction(
  deps: RunMenuBarToggleActionDeps,
): TogglePeonPingResult {
  const result = deps.togglePeonPing(deps.paths, deps.run);
  deps.setStatus(result.status);
  return result;
}

type SetConfig = (config: PeonPingConfig) => void;

export type RunMenuBarSetVolumeActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setVolume: typeof setVolume;
  setConfig: SetConfig;
};

export function runMenuBarSetVolumeAction(
  _deps: RunMenuBarSetVolumeActionDeps,
  _volume: number,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarSetActivePackActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setActivePack: typeof setActivePack;
  setConfig: SetConfig;
};

export function runMenuBarSetActivePackAction(
  _deps: RunMenuBarSetActivePackActionDeps,
  _packName: string,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarNextPackActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  advanceToNextPack: typeof advanceToNextPack;
  setConfig: SetConfig;
};

export function runMenuBarNextPackAction(
  _deps: RunMenuBarNextPackActionDeps,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarToggleNotificationsActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setDesktopNotifications: typeof setDesktopNotifications;
  setConfig: SetConfig;
};

export function runMenuBarToggleNotificationsAction(
  _deps: RunMenuBarToggleNotificationsActionDeps,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarToggleHeadphonesOnlyActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setHeadphonesOnly: typeof setHeadphonesOnly;
  setConfig: SetConfig;
};

export function runMenuBarToggleHeadphonesOnlyAction(
  _deps: RunMenuBarToggleHeadphonesOnlyActionDeps,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarSetRotationModeActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setPackRotationMode: typeof setPackRotationMode;
  setConfig: SetConfig;
};

export function runMenuBarSetRotationModeAction(
  _deps: RunMenuBarSetRotationModeActionDeps,
  _mode: PeonPingPackRotationMode,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarToggleCategoryActionDeps = {
  configFilePath: string;
  pausedFilePath: string;
  setCategoryEnabled: typeof setCategoryEnabled;
  setConfig: SetConfig;
};

export function runMenuBarToggleCategoryAction(
  _deps: RunMenuBarToggleCategoryActionDeps,
  _category: string,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarSetNotificationStyleActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setNotificationStyle: typeof setNotificationStyle;
  setConfig: SetConfig;
};

export function runMenuBarSetNotificationStyleAction(
  _deps: RunMenuBarSetNotificationStyleActionDeps,
  _style: PeonPingNotificationStyle,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarSetNotificationPositionActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setNotificationPosition: typeof setNotificationPosition;
  setConfig: SetConfig;
};

export function runMenuBarSetNotificationPositionAction(
  _deps: RunMenuBarSetNotificationPositionActionDeps,
  _position: PeonPingNotificationPosition,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarSetDismissTimeActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setNotificationDismissTime: typeof setNotificationDismissTime;
  setConfig: SetConfig;
};

export function runMenuBarSetDismissTimeAction(
  _deps: RunMenuBarSetDismissTimeActionDeps,
  _seconds: number,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export type RunMenuBarToggleMobileActionDeps = {
  paths: PeonPingResolvedPaths;
  run: PeonPingCommandRunner;
  setMobileNotifications: typeof setMobileNotifications;
  setConfig: SetConfig;
};

export function runMenuBarToggleMobileAction(
  _deps: RunMenuBarToggleMobileActionDeps,
  _enabled: boolean,
): PeonPingConfig {
  throw new Error("Not implemented");
}

export default function Command() {
  const paths = resolvePeonPingPaths(
    getResolvePeonPingPathsInputFromPreferences(),
  );
  const [status, setStatus] = useState(() =>
    getPeonPingStatus(paths.configFilePath, paths.pausedFilePath),
  );

  const presentation = getMenuBarPresentation({ enabled: status.enabled });
  return (
    <MenuBarExtra
      icon={
        presentation.iconToken === "peonOn"
          ? {
              source: {
                light: "menu-bar-peon-on.svg",
                dark: "menu-bar-peon-on@dark.svg",
              },
            }
          : {
              source: {
                light: "menu-bar-peon-off.svg",
                dark: "menu-bar-peon-off@dark.svg",
              },
            }
      }
      tooltip={presentation.tooltip}
    >
      <MenuBarExtra.Item
        title="Toggle Peon Ping"
        onAction={() => {
          runMenuBarToggleAction({
            paths,
            run,
            togglePeonPing,
            setStatus,
          });
        }}
      />
    </MenuBarExtra>
  );
}
