import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  launchCommand,
  showToast,
} from "@raycast/api";
import { execFileSync } from "node:child_process";
import { useState } from "react";
import { getPeonPingConfig } from "./lib/peon-ping-config";
import {
  buildDashboardItems,
  type DashboardAction,
  type DashboardItem,
  type MetadataEntry,
} from "./lib/peon-ping-dashboard";
import { getInstalledPacks } from "./lib/peon-ping-packs";
import {
  withPeonPingCommandTarget,
  type PeonPingCommandPaths,
} from "./lib/peon-ping-command-target";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import { resolvePeonPingPaths } from "./lib/peon-ping-paths";
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
} from "./lib/peon-ping-service";
import {
  runAddPackToRotationAction,
  runClearPackRotationAction,
  runNextPackAction,
  runRemovePathRuleAction,
  runRemovePackFromRotationAction,
  runSetPathRulePackAction,
  runSetSessionStartCooldownSecondsAction,
  runSetSilentWindowSecondsAction,
  runSetActivePackAction,
  runSetDebugEnabledAction,
  runSetDismissTimeAction,
  runSetNotificationPositionAction,
  runSetNotificationStyleAction,
  runSetRotationModeAction,
  runSetTrainerExerciseGoalAction,
  runSetTrainerReminderIntervalMinutesAction,
  runSetTrainerReminderMinGapMinutesAction,
  runSetVolumeAction,
  runStatusToggleAndRefreshMenuBarSafely,
  runToggleMeetingDetectAction,
  runToggleCategoryAction,
  runToggleHeadphonesOnlyAction,
  runToggleMobileAction,
  runToggleNotificationAllScreensAction,
  runToggleNotificationsAction,
  runToggleSuppressSubagentCompleteAction,
  runToggleUseSoundEffectsDeviceAction,
  runSetTrainerEnabledAction,
} from "./lib/peon-ping-actions";
import type { PeonPingConfig } from "./lib/peon-ping-config";
import type { InstalledPack } from "./lib/peon-ping-packs";
import type { Dispatch, SetStateAction } from "react";

const run: PeonPingCommandRunner = (command, args) =>
  execFileSync(command, [...args], { encoding: "utf8" });

const ICON_MAP: Record<string, Icon> = {
  pause: Icon.Pause,
  play: Icon.Play,
  speakerOn: Icon.SpeakerOn,
  music: Icon.Music,
  arrowClockwise: Icon.ArrowClockwise,
  bulletPoints: Icon.BulletPoints,
  bell: Icon.Bell,
  headphones: Icon.Headphones,
  appWindowSidebarRight: Icon.AppWindowSidebarRight,
  window: Icon.Window,
  clock: Icon.Clock,
  mobile: Icon.Mobile,
};

const COLOR_MAP = {
  green: Color.Green,
  red: Color.Red,
  secondary: Color.SecondaryText,
} as const;

function DashboardDetail({ metadata }: { metadata: MetadataEntry[] }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {metadata.map((entry, i) => {
            if (entry.kind === "separator") {
              return <List.Item.Detail.Metadata.Separator key={i} />;
            }
            if (entry.kind === "tagList") {
              return (
                <List.Item.Detail.Metadata.TagList key={i} title={entry.title}>
                  {entry.items.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={tag.text}
                      text={tag.text}
                      color={tag.color ? COLOR_MAP[tag.color] : undefined}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              );
            }
            return (
              <List.Item.Detail.Metadata.Label
                key={i}
                title={entry.title}
                text={
                  entry.textColor
                    ? {
                        value: entry.text ?? "",
                        color: COLOR_MAP[entry.textColor],
                      }
                    : entry.text
                }
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

type ActionDeps = {
  paths: PeonPingCommandPaths;
  setConfig: Dispatch<SetStateAction<PeonPingConfig>>;
};

function executeAction(
  action: DashboardAction,
  deps: ActionDeps,
): PeonPingConfig {
  const { paths, setConfig } = deps;
  switch (action.kind) {
    case "setVolume":
      return runSetVolumeAction(
        { paths, run, setVolume, setConfig },
        action.volume,
      );
    case "setActivePack":
      return runSetActivePackAction(
        { paths, run, setActivePack, setConfig },
        action.packName,
      );
    case "advanceToNextPack":
      return runNextPackAction({ paths, run, advanceToNextPack, setConfig });
    case "setRotationMode":
      return runSetRotationModeAction(
        { paths, run, setPackRotationMode, setConfig },
        action.mode,
      );
    case "addPackToRotation":
      return runAddPackToRotationAction(
        { paths, run, addPackToRotation, setConfig },
        action.packName,
      );
    case "removePackFromRotation":
      return runRemovePackFromRotationAction(
        { paths, run, removePackFromRotation, setConfig },
        action.packName,
      );
    case "clearPackRotation":
      return runClearPackRotationAction({
        paths,
        run,
        clearPackRotation,
        setConfig,
      });
    case "removePathRule":
      return runRemovePathRuleAction(
        { paths, run, removePathRule, setConfig },
        action.pattern,
      );
    case "setPathRulePack":
      return runSetPathRulePackAction(
        { paths, run, setPathRulePack, setConfig },
        action.pattern,
        action.packName,
      );
    case "toggleCategory":
      return runToggleCategoryAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setCategoryEnabled,
          setConfig,
        },
        action.categoryKey,
        action.nextEnabled,
      );
    case "toggleDesktopNotifications":
      return runToggleNotificationsAction(
        { paths, run, setDesktopNotifications, setConfig },
        action.nextEnabled,
      );
    case "setNotificationStyle":
      return runSetNotificationStyleAction(
        { paths, run, setNotificationStyle, setConfig },
        action.style,
      );
    case "setNotificationPosition":
      return runSetNotificationPositionAction(
        { paths, run, setNotificationPosition, setConfig },
        action.position,
      );
    case "cycleDismissTime":
      return runSetDismissTimeAction(
        { paths, run, setNotificationDismissTime, setConfig },
        action.nextSeconds,
      );
    case "toggleMobileNotifications":
      return runToggleMobileAction(
        { paths, run, setMobileNotifications, setConfig },
        action.nextEnabled,
      );
    case "toggleNotificationAllScreens":
      return runToggleNotificationAllScreensAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setNotificationAllScreens,
          setConfig,
        },
        action.nextEnabled,
      );
    case "toggleHeadphonesOnly":
      return runToggleHeadphonesOnlyAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setHeadphonesOnly,
          setConfig,
        },
        action.nextEnabled,
      );
    case "toggleUseSoundEffectsDevice":
      return runToggleUseSoundEffectsDeviceAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setUseSoundEffectsDevice,
          setConfig,
        },
        action.nextEnabled,
      );
    case "toggleMeetingDetect":
      return runToggleMeetingDetectAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setMeetingDetect,
          setConfig,
        },
        action.nextEnabled,
      );
    case "setSilentWindowSeconds":
      return runSetSilentWindowSecondsAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setSilentWindowSeconds,
          setConfig,
        },
        action.seconds,
      );
    case "setSessionStartCooldownSeconds":
      return runSetSessionStartCooldownSecondsAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setSessionStartCooldownSeconds,
          setConfig,
        },
        action.seconds,
      );
    case "toggleSuppressSubagentComplete":
      return runToggleSuppressSubagentCompleteAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setSuppressSubagentComplete,
          setConfig,
        },
        action.nextEnabled,
      );
    case "toggleDebugEnabled":
      return runSetDebugEnabledAction(
        { paths, run, setDebugEnabled, setConfig },
        action.nextEnabled,
      );
    case "toggleTrainerEnabled":
      return runSetTrainerEnabledAction(
        { paths, run, setTrainerEnabled, setConfig },
        action.nextEnabled,
      );
    case "setTrainerExerciseGoal":
      return runSetTrainerExerciseGoalAction(
        { paths, run, setTrainerExerciseGoal, setConfig },
        action.exercise,
        action.goal,
      );
    case "setTrainerReminderIntervalMinutes":
      return runSetTrainerReminderIntervalMinutesAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setTrainerReminderIntervalMinutes,
          setConfig,
        },
        action.minutes,
      );
    case "setTrainerReminderMinGapMinutes":
      return runSetTrainerReminderMinGapMinutesAction(
        {
          configFilePath: paths.configFilePath,
          pausedFilePath: paths.pausedFilePath,
          setTrainerReminderMinGapMinutes,
          setConfig,
        },
        action.minutes,
      );
    case "toggleStatus":
      throw new Error("toggleStatus should not go through executeAction");
  }
}

function actionKey(action: DashboardAction): string {
  switch (action.kind) {
    case "setVolume":
      return `vol-${action.volume}`;
    case "setActivePack":
      return `pack-${action.packName}`;
    case "setRotationMode":
      return `rot-${action.mode}`;
    case "addPackToRotation":
      return `rotation-add-${action.packName}`;
    case "removePackFromRotation":
      return `rotation-remove-${action.packName}`;
    case "removePathRule":
      return `path-rule-${action.pattern}`;
    case "setPathRulePack":
      return `path-rule-pack-${action.pattern}-${action.packName}`;
    case "toggleCategory":
      return `cat-${action.categoryKey}`;
    case "setNotificationStyle":
      return `style-${action.style}`;
    case "setNotificationPosition":
      return `pos-${action.position}`;
    case "setSilentWindowSeconds":
      return `silent-window-${action.seconds}`;
    case "setSessionStartCooldownSeconds":
      return `session-start-cooldown-${action.seconds}`;
    case "setTrainerExerciseGoal":
      return `trainer-goal-${action.exercise}-${action.goal}`;
    case "setTrainerReminderIntervalMinutes":
      return `trainer-reminder-interval-${action.minutes}`;
    case "setTrainerReminderMinGapMinutes":
      return `trainer-min-gap-${action.minutes}`;
    default:
      return action.kind;
  }
}

function findItem(
  items: DashboardItem[],
  itemId: string,
): DashboardItem | undefined {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.subItems) {
      const found = findItem(item.subItems, itemId);
      if (found) return found;
    }
  }
  return undefined;
}

function OptionPicker({
  itemId,
  navigationTitle,
  initialConfig,
  packs,
  deps,
}: {
  itemId: string;
  navigationTitle: string;
  initialConfig: PeonPingConfig;
  packs: InstalledPack[];
  deps: ActionDeps;
}) {
  const [localConfig, setLocalConfig] = useState(initialConfig);
  const items = buildDashboardItems({ config: localConfig, packs });
  const item = findItem(items, itemId)!;

  return (
    <List navigationTitle={navigationTitle}>
      {item.actions.map((action) => (
        <List.Item
          key={actionKey(action)}
          title={action.subListTitle ?? action.title}
          icon={
            action.kind === "advanceToNextPack"
              ? Icon.ArrowRight
              : action.kind === "cycleDismissTime"
                ? Icon.Clock
                : action.isCurrent
                  ? Icon.Checkmark
                  : Icon.Circle
          }
          actions={
            <ActionPanel>
              <Action
                title={action.title}
                onAction={() => {
                  const newConfig = executeAction(action, deps);
                  setLocalConfig(newConfig);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SubDashboard({
  parentId,
  navigationTitle,
  initialConfig,
  packs,
  deps,
}: {
  parentId: string;
  navigationTitle: string;
  initialConfig: PeonPingConfig;
  packs: InstalledPack[];
  deps: ActionDeps;
}) {
  const [localConfig, setLocalConfig] = useState(initialConfig);
  const items = buildDashboardItems({ config: localConfig, packs });
  const parent = findItem(items, parentId)!;

  const localDeps: ActionDeps = {
    paths: deps.paths,
    setConfig: (value) => {
      deps.setConfig(value);
      setLocalConfig(value);
    },
  };

  return (
    <List isShowingDetail navigationTitle={navigationTitle}>
      {parent.subItems!.map((subItem) => (
        <DashboardListItem
          key={subItem.id}
          item={subItem}
          config={localConfig}
          packs={packs}
          deps={localDeps}
        />
      ))}
    </List>
  );
}

function DashboardActionPanel({
  item,
  config,
  packs,
  deps,
}: {
  item: DashboardItem;
  config: PeonPingConfig;
  packs: InstalledPack[];
  deps: ActionDeps;
}) {
  const { paths, setConfig } = deps;

  if (item.drillable && item.subItems) {
    return (
      <ActionPanel>
        <Action.Push
          title={item.title}
          target={
            <SubDashboard
              parentId={item.id}
              navigationTitle={item.title}
              initialConfig={config}
              packs={packs}
              deps={deps}
            />
          }
        />
      </ActionPanel>
    );
  }

  if (item.drillable) {
    return (
      <ActionPanel>
        <Action.Push
          title={item.title}
          target={
            <OptionPicker
              itemId={item.id}
              navigationTitle={item.title}
              initialConfig={config}
              packs={packs}
              deps={deps}
            />
          }
        />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      {item.actions.map((action) => {
        if (action.kind === "toggleStatus") {
          return (
            <Action
              key={action.kind}
              title={action.title}
              icon={action.nextEnabled ? Icon.Play : Icon.Pause}
              onAction={() =>
                runStatusToggleAndRefreshMenuBarSafely(
                  {
                    paths,
                    run,
                    togglePeonPing,
                    setStatus: (s) =>
                      setConfig((prev) => ({
                        ...prev,
                        effectivelyEnabled: s.enabled,
                      })),
                  },
                  { launchCommand },
                  { showToast },
                )
              }
            />
          );
        }
        return (
          <Action
            key={actionKey(action)}
            title={action.title}
            onAction={() => executeAction(action, deps)}
          />
        );
      })}
    </ActionPanel>
  );
}

function DashboardListItem({
  item,
  config,
  packs,
  deps,
}: {
  item: DashboardItem;
  config: PeonPingConfig;
  packs: InstalledPack[];
  deps: ActionDeps;
}) {
  const accessories: List.Item.Accessory[] = item.accessoryTagColor
    ? [
        {
          tag: {
            value: item.accessoryText,
            color: COLOR_MAP[item.accessoryTagColor],
          },
        },
      ]
    : [{ text: item.accessoryText }];

  return (
    <List.Item
      id={item.id}
      title={item.title}
      icon={ICON_MAP[item.icon]}
      accessories={accessories}
      detail={<DashboardDetail metadata={item.metadata} />}
      actions={
        <DashboardActionPanel
          item={item}
          config={config}
          packs={packs}
          deps={deps}
        />
      }
    />
  );
}

export default function Command() {
  const paths = withPeonPingCommandTarget(
    resolvePeonPingPaths(getResolvePeonPingPathsInputFromPreferences()),
  );
  const [config, setConfig] = useState(() =>
    getPeonPingConfig(paths.configFilePath, paths.pausedFilePath),
  );
  const [packs] = useState(() => getInstalledPacks(paths.packsDir));

  const items = buildDashboardItems({ config, packs });
  const deps: ActionDeps = { paths, setConfig };

  return (
    <List isShowingDetail navigationTitle="Peon Ping">
      {items.map((item) => (
        <DashboardListItem
          key={item.id}
          item={item}
          config={config}
          packs={packs}
          deps={deps}
        />
      ))}
    </List>
  );
}
