import {
  Action,
  ActionPanel,
  captureException,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";

import type { System } from "../types/system";
import type { Alert } from "../types/alert";
import { StatsDetailView } from "./views/SystemStatsView";
import { ContainersView } from "./views/ContainersView";
import { usePreferences } from "../hooks/use-preferences";
import { useListCollection } from "../hooks/use-list-collection";
import { getSystemUrl } from "../utils/urls";
import { renderAlertCondition } from "../utils/alerts";
import { renderUptime } from "../utils/stats";
import { ListMetadataSectionHeader } from "./ListMetadataSectionHeader";

export interface SystemListItemProps {
  system: System;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

export function SystemListItem({ system, isShowingDetail, onToggleDetail }: SystemListItemProps) {
  const preferences = usePreferences();
  const { data, isLoading } = useListCollection<Alert>("alerts", {
    filter: `system='${system.id}'`,
  });

  return (
    <List.Item
      title={system.name}
      subtitle={isShowingDetail ? "" : system.info.m}
      icon={{
        source: Icon.MemoryChip,
        tintColor: system.status === "up" ? Color.Green : Color.Red,
      }}
      accessories={
        isShowingDetail
          ? []
          : [{ icon: Icon.Plug, text: `${system.host}:${system.port}` }, { date: new Date(system.updated) }]
      }
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <ListMetadataSectionHeader hasSpaceBefore={false} title="Information" icon={Icon.Info} />
              <List.Item.Detail.Metadata.Label title="Status" text={system.status} />
              <List.Item.Detail.Metadata.Label title="Uptime" text={`${renderUptime(system.info.u)}`} />
              <List.Item.Detail.Metadata.Label title="Kernel" text={system.info.k} />
              <List.Item.Detail.Metadata.Label title="CPU Model" text={system.info.m} />
              <List.Item.Detail.Metadata.Label
                title="CPU Core/Threads"
                text={`${system.info.c}C / ${system.info.t}T`}
              />
              <ListMetadataSectionHeader title="Configured Alerts" icon={Icon.Bell} />
              {data.map((alertInfo) => (
                <List.Item.Detail.Metadata.Label
                  key={alertInfo.id}
                  title={alertInfo.name}
                  text={renderAlertCondition(alertInfo)}
                />
              ))}
              <ListMetadataSectionHeader title="Agent" icon={Icon.Network} />
              <List.Item.Detail.Metadata.Label title="Version" text={system.info.v} />
              <List.Item.Detail.Metadata.Label title="Hostname" text={system.info.h} />
              <List.Item.Detail.Metadata.Label title="Connection" text={`${system.host}:${system.port}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
          />
          <Action.Push title="Show Containers" icon={Icon.Box} target={<ContainersView system={system} />} />
          <Action.Push title="Show System Stats" icon={Icon.LineChart} target={<StatsDetailView system={system} />} />
          <Action
            title="Show Alerts"
            shortcut={{
              key: "a",
              modifiers: [],
            }}
            icon={Icon.Bell}
            onAction={() => {
              launchCommand({
                name: "alerts",
                type: LaunchType.UserInitiated,
                context: {
                  search: system.name,
                },
              }).catch(captureException);
            }}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            shortcut={Keyboard.Shortcut.Common.Open}
            url={getSystemUrl(preferences.host, system)}
          />
        </ActionPanel>
      }
    />
  );
}
