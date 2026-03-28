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
  type DashboardItemId,
  type MetadataEntry,
} from "./lib/peon-ping-dashboard";
import { getInstalledPacks } from "./lib/peon-ping-packs";
import { getResolvePeonPingPathsInputFromPreferences } from "./lib/preferences";
import type { PeonPingResolvedPaths } from "./lib/peon-ping-paths";
import { resolvePeonPingPaths } from "./lib/peon-ping-paths";
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
} from "./lib/peon-ping-service";
import {
  runNextPackAction,
  runSetActivePackAction,
  runSetDismissTimeAction,
  runSetNotificationPositionAction,
  runSetNotificationStyleAction,
  runSetRotationModeAction,
  runSetVolumeAction,
  runStatusToggleAndRefreshMenuBarSafely,
  runToggleCategoryAction,
  runToggleHeadphonesOnlyAction,
  runToggleMobileAction,
  runToggleNotificationsAction,
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
  paths: PeonPingResolvedPaths;
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
    case "toggleCategory":
      return `cat-${action.categoryKey}`;
    case "setNotificationStyle":
      return `style-${action.style}`;
    case "setNotificationPosition":
      return `pos-${action.position}`;
    default:
      return action.kind;
  }
}

function OptionPicker({
  itemId,
  navigationTitle,
  initialConfig,
  packs,
  deps,
}: {
  itemId: DashboardItemId;
  navigationTitle: string;
  initialConfig: PeonPingConfig;
  packs: InstalledPack[];
  deps: ActionDeps;
}) {
  const [localConfig, setLocalConfig] = useState(initialConfig);
  const items = buildDashboardItems({ config: localConfig, packs });
  const item = items.find((i) => i.id === itemId)!;

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
  const paths = resolvePeonPingPaths(
    getResolvePeonPingPathsInputFromPreferences(),
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
