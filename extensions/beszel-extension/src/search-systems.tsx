import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";

import { type BeszelSystem, useSystems } from "./hooks/use-systems";
import { secondsToUptime } from "./helpers/seconds-to-uptime";

function getSystemIconTintColor(system: BeszelSystem): Color {
  switch (system.status) {
    case "up":
      return Color.Green;
    case "down":
      return Color.Red;
    case "paused":
      return Color.SecondaryText;
    case "pending":
      return Color.Blue;
  }
}

export default function Command() {
  const { url } = getPreferenceValues<Preferences.SearchSystems>();
  const { systems, isLoading } = useSystems();

  return (
    <List isLoading={isLoading} isShowingDetail>
      {systems?.map((system) => (
        <List.Item
          key={system.id}
          title={system.name}
          icon={{ source: Icon.Dot, tintColor: getSystemIconTintColor(system) }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="State">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={system.status}
                      color={getSystemIconTintColor(system)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="CPU" text={`${system.info.cpu.toFixed(2)}%`} />
                  <List.Item.Detail.Metadata.Label title="Memory" text={`${system.info.mp.toFixed(2)}%`} />
                  <List.Item.Detail.Metadata.Label title="Disk" text={`${system.info.dp.toFixed(2)}%`} />
                  <List.Item.Detail.Metadata.Label title="Network" text={`${system.info.b} MB/s`} />
                  <List.Item.Detail.Metadata.Label title="Uptime" text={secondsToUptime(system.info.u)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Chip"
                    text={`${system.info.m} (${system.info.c}c/${system.info.t}t)`}
                  />
                  <List.Item.Detail.Metadata.Label title="Kernel" text={system.info.k} />
                  <List.Item.Detail.Metadata.Label title="Hostname" text={system.info.h} />
                  <List.Item.Detail.Metadata.Label title="Agent Version" text={system.info.v} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Last Updated" text={system.updated} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={new URL(`/system/${system.name}`, url).toString()} />
              <Action.CopyToClipboard title="Copy Hostname" content={system.info.h} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
