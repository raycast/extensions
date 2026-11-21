import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { type Instance, tokenForInstance } from "./instances";
import { parseTrpcJsonResponseSince, trpcQueryUrl } from "./trpc";

interface DockerEvent {
  Type?: string;
  Action?: string;
  Actor?: { ID?: string; Attributes?: Record<string, string> };
  /** Unix seconds. */
  time?: number;
}

// The default comes first: `List.Dropdown` calls `onChange` once by itself on mount with its first
// item (see `useInstanceScope`), which is then a no-op.
const RANGES = [
  { title: "Last 15 Minutes", minutes: 15 },
  { title: "Last 5 Minutes", minutes: 5 },
  { title: "Last Hour", minutes: 60 },
  { title: "Last 6 Hours", minutes: 360 },
  { title: "Last 24 Hours", minutes: 1440 },
];

// Same grouping Dokploy's own events table colors by.
const ACTION_COLORS: Record<string, Color> = {
  create: Color.Green,
  start: Color.Green,
  pull: Color.Green,
  connect: Color.Green,
  die: Color.Red,
  destroy: Color.Red,
  kill: Color.Red,
  stop: Color.Red,
  remove: Color.Red,
  disconnect: Color.Red,
  pause: Color.Yellow,
  unpause: Color.Yellow,
};

const TYPE_ICONS: Record<string, Icon> = {
  container: Icon.Box,
  image: Icon.Layers,
  volume: Icon.HardDrive,
  network: Icon.Network,
  service: Icon.Cog,
  node: Icon.ComputerChip,
};

/**
 * `docker events` for the instance's own Dokploy host over a recent time window, newest first -
 * no `serverId`, matching the containers list this is reached from.
 */
export default function DockerEvents({ instance }: { instance: Instance }) {
  const { url, headers } = tokenForInstance(instance);
  const [minutes, setMinutes] = useState(RANGES[0].minutes);
  const [showingDetail, setShowingDetail] = useState(false);

  const { isLoading, data, error, revalidate } = useFetch<{ events: DockerEvent[] }>(
    trpcQueryUrl(url, "docker.getEvents", { minutes }),
    {
      headers,
      parseResponse: (response) => parseTrpcJsonResponseSince<{ events: DockerEvent[] }>(response, "v0.30.0"),
      // Shown in the empty view below instead.
      onError: () => {},
    },
  );
  const events = data?.events ?? [];
  const range = RANGES.find((r) => r.minutes === minutes) ?? RANGES[0];

  const refreshAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && events.length > 0}
      navigationTitle={`Docker Events - ${instance.name}`}
      searchBarPlaceholder="Search by name, type, or action"
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={String(minutes)} onChange={(value) => setMinutes(Number(value))}>
          {RANGES.map((r) => (
            <List.Dropdown.Item key={r.minutes} title={r.title} value={String(r.minutes)} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load events"
          description={`${error}`}
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : isLoading ? null : (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Events"
          description={`Nothing happened on this server in the ${range.title.toLowerCase()}.`}
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      {events.map((event, index) => {
        const name = event.Actor?.Attributes?.name ?? event.Actor?.ID ?? "-";
        const attributes = Object.entries(event.Actor?.Attributes ?? {}).filter(([key]) => key !== "name");
        const date = event.time ? new Date(event.time * 1000) : undefined;
        return (
          <List.Item
            key={`${event.time}-${event.Action}-${index}`}
            icon={{ source: TYPE_ICONS[event.Type ?? ""] ?? Icon.Circle, tooltip: event.Type }}
            title={name}
            subtitle={showingDetail ? undefined : event.Type}
            keywords={[event.Type ?? "", event.Action ?? ""]}
            // Raycast recommends leaving accessories off while the detail panel is showing.
            accessories={
              showingDetail
                ? undefined
                : [
                    {
                      tag: {
                        value: event.Action ?? "-",
                        color: ACTION_COLORS[event.Action ?? ""] ?? Color.SecondaryText,
                      },
                    },
                    ...(date ? [{ date, tooltip: date.toLocaleString() }] : []),
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={event.Type ?? "-"} />
                    <List.Item.Detail.Metadata.Label title="Action" text={event.Action ?? "-"} />
                    <List.Item.Detail.Metadata.Label title="Time" text={date?.toLocaleString() ?? "-"} />
                    {event.Actor?.ID && <List.Item.Detail.Metadata.Label title="ID" text={event.Actor.ID} />}
                    {attributes.length > 0 && <List.Item.Detail.Metadata.Separator />}
                    {attributes.map(([key, value]) => (
                      <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Sidebar}
                  title={showingDetail ? "Hide Details" : "Show Details"}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => setShowingDetail((value) => !value)}
                />
                {event.Actor?.ID && <Action.CopyToClipboard title="Copy ID" content={event.Actor.ID} />}
                {refreshAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
