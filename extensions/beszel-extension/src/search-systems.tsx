import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo } from "react";

import { useSystems } from "./hooks/use-systems";
import { secondsToUptime } from "./helpers/seconds-to-uptime";
import { useClient } from "./hooks/use-client";
import type { BeszelSystem, BeszelSystemStatus } from "./types/beszel";

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
  const client = useClient();
  const { systems, isLoading, error } = useSystems(client);

  useEffect(() => {
    if (!error) return;

    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: error,
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => {
          openExtensionPreferences();
        },
      },
    });
  }, [error]);

  const onPause = useCallback(
    async (system: BeszelSystem) => {
      if (!client) return;

      await client.collection("systems").update(system.id, { status: "paused" });
    },
    [client],
  );

  const onResume = useCallback(
    async (system: BeszelSystem) => {
      if (!client) return;

      await client.collection("systems").update(system.id, { status: "pending" });
    },
    [client],
  );

  const grouped = useMemo(() => {
    if (!systems) return {};

    return systems.reduce<Partial<Record<BeszelSystemStatus, BeszelSystem[]>>>((acc, system) => {
      acc[system.status] = [...(acc[system.status] || []), system];
      return acc;
    }, {});
  }, [systems]);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {Object.entries(grouped).map(([status, filtered]) => (
        <List.Section
          key={status}
          title={status.toUpperCase()}
          subtitle={`${filtered.length.toString()} system${filtered.length === 1 ? "" : "s"}`}
        >
          {filtered.map((system) => (
            <List.Item
              key={system.id}
              title={system.name}
              icon={{ source: Icon.Monitor, tintColor: getSystemIconTintColor(system) }}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="State">
                        <List.Item.Detail.Metadata.TagList.Item text={status} color={getSystemIconTintColor(system)} />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label title="CPU" text={`${system.info.cpu.toFixed(2)}%`} />
                      <List.Item.Detail.Metadata.Label title="Memory" text={`${system.info.mp.toFixed(2)}%`} />
                      <List.Item.Detail.Metadata.Label title="Disk" text={`${system.info.dp.toFixed(2)}%`} />
                      <List.Item.Detail.Metadata.Label title="Network" text={`${system.info.b} MB/s`} />
                      <List.Item.Detail.Metadata.Label title="Uptime" text={secondsToUptime(system.info.u)} />
                      <List.Item.Detail.Metadata.Label
                        title="Chip"
                        text={`${system.info.m} (${system.info.c}c/${system.info.t}t)`}
                      />
                      <List.Item.Detail.Metadata.Label title="Kernel" text={system.info.k} />
                      <List.Item.Detail.Metadata.Label title="Hostname" text={system.info.h} />
                      <List.Item.Detail.Metadata.Label title="Agent Version" text={system.info.v} />
                      <List.Item.Detail.Metadata.Label title="Last Updated" text={system.updated} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={new URL(`/system/${system.name}`, url).toString()} />
                  <Action.CopyToClipboard title="Copy Hostname" content={system.info.h} />
                  {status !== "paused" ? (
                    <Action
                      title="Pause"
                      icon={Icon.Pause}
                      onAction={() => onPause(system)}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                  ) : (
                    <Action
                      title="Resume"
                      icon={Icon.Play}
                      onAction={() => onResume(system)}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
