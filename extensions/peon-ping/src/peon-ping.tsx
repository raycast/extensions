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

function DashboardActionPanel({
  actions,
  deps,
}: {
  actions: DashboardAction[];
  deps: ActionDeps;
}) {
  const { paths, setConfig } = deps;

  return (
    <ActionPanel>
      {actions.map((action) => {
        switch (action.kind) {
          case "toggleStatus":
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
          case "setVolume":
            return (
              <Action
                key={`vol-${action.volume}`}
                title={action.title}
                onAction={() =>
                  runSetVolumeAction(
                    { paths, run, setVolume, setConfig },
                    action.volume,
                  )
                }
              />
            );
          case "setActivePack":
            return (
              <Action
                key={`pack-${action.packName}`}
                title={action.title}
                onAction={() =>
                  runSetActivePackAction(
                    { paths, run, setActivePack, setConfig },
                    action.packName,
                  )
                }
              />
            );
          case "advanceToNextPack":
            return (
              <Action
                key={action.kind}
                title={action.title}
                icon={Icon.ArrowRight}
                onAction={() =>
                  runNextPackAction({
                    paths,
                    run,
                    advanceToNextPack,
                    setConfig,
                  })
                }
              />
            );
          case "setRotationMode":
            return (
              <Action
                key={`rot-${action.mode}`}
                title={action.title}
                onAction={() =>
                  runSetRotationModeAction(
                    { paths, run, setPackRotationMode, setConfig },
                    action.mode,
                  )
                }
              />
            );
          case "toggleCategory":
            return (
              <Action
                key={`cat-${action.categoryKey}`}
                title={action.title}
                onAction={() =>
                  runToggleCategoryAction(
                    {
                      configFilePath: paths.configFilePath,
                      pausedFilePath: paths.pausedFilePath,
                      setCategoryEnabled,
                      setConfig,
                    },
                    action.categoryKey,
                    action.nextEnabled,
                  )
                }
              />
            );
          case "toggleDesktopNotifications":
            return (
              <Action
                key={action.kind}
                title={action.title}
                onAction={() =>
                  runToggleNotificationsAction(
                    { paths, run, setDesktopNotifications, setConfig },
                    action.nextEnabled,
                  )
                }
              />
            );
          case "setNotificationStyle":
            return (
              <Action
                key={`style-${action.style}`}
                title={action.title}
                onAction={() =>
                  runSetNotificationStyleAction(
                    { paths, run, setNotificationStyle, setConfig },
                    action.style,
                  )
                }
              />
            );
          case "setNotificationPosition":
            return (
              <Action
                key={`pos-${action.position}`}
                title={action.title}
                onAction={() =>
                  runSetNotificationPositionAction(
                    { paths, run, setNotificationPosition, setConfig },
                    action.position,
                  )
                }
              />
            );
          case "cycleDismissTime":
            return (
              <Action
                key={action.kind}
                title={action.title}
                icon={Icon.Clock}
                onAction={() =>
                  runSetDismissTimeAction(
                    { paths, run, setNotificationDismissTime, setConfig },
                    action.nextSeconds,
                  )
                }
              />
            );
          case "toggleMobileNotifications":
            return (
              <Action
                key={action.kind}
                title={action.title}
                onAction={() =>
                  runToggleMobileAction(
                    { paths, run, setMobileNotifications, setConfig },
                    action.nextEnabled,
                  )
                }
              />
            );
          case "toggleHeadphonesOnly":
            return (
              <Action
                key={action.kind}
                title={action.title}
                onAction={() =>
                  runToggleHeadphonesOnlyAction(
                    {
                      configFilePath: paths.configFilePath,
                      pausedFilePath: paths.pausedFilePath,
                      setHeadphonesOnly,
                      setConfig,
                    },
                    action.nextEnabled,
                  )
                }
              />
            );
        }
      })}
    </ActionPanel>
  );
}

function DashboardListItem({
  item,
  deps,
}: {
  item: DashboardItem;
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
      actions={<DashboardActionPanel actions={item.actions} deps={deps} />}
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
        <DashboardListItem key={item.id} item={item} deps={deps} />
      ))}
    </List>
  );
}
