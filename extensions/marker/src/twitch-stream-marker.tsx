// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useMemo } from "react";

import {
  MarkerSettings,
  MarkerTagSummary,
  MarkerTwitchChannelSummary,
  createMarker,
  getCompleteMarkerIntegrationContext,
  listMarkerTags,
  markerSettingsFromPreferences,
  tagsForSession,
} from "./marker-api";
import {
  dateWithOffset,
  offsetSeconds,
  optionalTrimmed,
  requiredString,
  runWithToast,
} from "./marker-ui";

type TwitchMarkerValues = {
  title?: string;
  description?: string;
  offset?: string;
  tagIDs: string[];
};

export default function Command() {
  const settings = useMemo(() => markerSettingsFromPreferences(), []);
  const contextState = useCachedPromise(
    getCompleteMarkerIntegrationContext,
    [settings],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load Marker context" },
    },
  );
  const context = contextState.data;
  const channels = context?.twitchChannels ?? [];
  const tags = context?.tags ?? [];
  const liveChannels = channels.filter((channel) => isLive(channel));
  const otherChannels = channels.filter((channel) => !isLive(channel));

  return (
    <List
      isLoading={contextState.isLoading}
      searchBarPlaceholder="Search Twitch channels"
      isShowingDetail
      emptyView={
        <List.EmptyView
          icon={Icon.Video}
          title="No Twitch Channels"
          description="Marker did not return linked Twitch channels. Connect Twitch in Marker, then refresh."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Channels"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  void contextState.revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      }
    >
      <ChannelSection
        title="Live Channels"
        channels={liveChannels}
        tags={tags}
        settings={settings}
        refresh={() => {
          void contextState.revalidate();
        }}
      />
      <ChannelSection
        title="Offline Channels"
        channels={otherChannels}
        tags={tags}
        settings={settings}
        refresh={() => {
          void contextState.revalidate();
        }}
      />
    </List>
  );
}

function ChannelSection(props: {
  title: string;
  channels: MarkerTwitchChannelSummary[];
  tags: MarkerTagSummary[];
  settings: MarkerSettings;
  refresh: () => void;
}) {
  if (!props.channels.length) {
    return null;
  }

  return (
    <List.Section title={props.title}>
      {props.channels.map((channel) => {
        const canAddMarker =
          isLive(channel) && channel.markerSessionID && channel.subSessionID;
        const sessionTags = tagsForSession(props.tags, channel.markerSessionID);
        return (
          <List.Item
            key={channel.id}
            title={channel.displayName}
            subtitle={channel.streamTitle ?? unavailableReason(channel)}
            icon={channel.profileImageURL || Icon.Video}
            accessories={[
              {
                text: isLive(channel) ? "Live" : "Offline",
                icon: {
                  source: Icon.Circle,
                  tintColor: isLive(channel) ? Color.Red : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={channelMarkdown(channel, Boolean(canAddMarker))}
              />
            }
            actions={
              <ActionPanel title={channel.displayName}>
                <ActionPanel.Section>
                  {canAddMarker ? (
                    <Action.Push
                      title="Add Marker"
                      icon={Icon.PlusCircle}
                      target={
                        <TwitchMarkerForm
                          settings={props.settings}
                          channel={channel}
                          tags={sessionTags}
                          onDone={props.refresh}
                        />
                      }
                    />
                  ) : null}
                  <Action
                    title="Refresh Channels"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={props.refresh}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Channel ID"
                    icon={Icon.Clipboard}
                    content={channel.id}
                  />
                  {channel.streamID ? (
                    <Action.CopyToClipboard
                      title="Copy Stream ID"
                      icon={Icon.Clipboard}
                      content={channel.streamID}
                    />
                  ) : null}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function TwitchMarkerForm(props: {
  settings: MarkerSettings;
  channel: MarkerTwitchChannelSummary;
  tags: MarkerTagSummary[];
  onDone: () => void;
}) {
  const captureDate = useMemo(() => new Date(), []);
  const { pop } = useNavigation();
  const sessionID = props.channel.markerSessionID;
  const tagState = useCachedPromise(
    async (settings, sessionID: string | undefined) =>
      sessionID ? listMarkerTags({ ...settings, sessionID }) : [],
    [props.settings, sessionID],
    {
      failureToastOptions: { title: "Could not load Marker tags" },
    },
  );
  const tags = useMemo(() => {
    if (tagState.data) {
      return tagState.data;
    }
    return tagsForSession(props.tags, sessionID);
  }, [props.tags, sessionID, tagState.data]);
  const { handleSubmit, itemProps } = useForm<TwitchMarkerValues>({
    initialValues: {
      title: props.channel.streamTitle,
      tagIDs: [],
    },
    async onSubmit(values) {
      const name = optionalTrimmed(values.title) ?? "";
      const sessionID = requiredString(
        props.channel.markerSessionID,
        "This Twitch channel is not linked to a Marker session.",
      );
      const subSessionID = requiredString(
        props.channel.subSessionID,
        "This Twitch channel does not have a live sub-session.",
      );
      const markerDate = dateWithOffset(
        values.offset,
        captureDate,
      ).toISOString();
      const now = new Date().toISOString();

      await runWithToast({
        loadingTitle: "Adding Twitch marker...",
        successTitle: "Twitch marker added",
        failureTitle: "Could not add Twitch marker",
        task: async () => {
          await createMarker({
            ...props.settings,
            name,
            note: optionalTrimmed(values.description),
            sessionID,
            subSessionID,
            tagIDs: values.tagIDs.filter((tagID) =>
              tags.some((tag) => tag.id === tagID),
            ),
            clientID: randomUUID(),
            date: markerDate,
            createdAt: now,
            updatedAt: now,
          });
          props.onDone();
          pop();
        },
      });
    },
    validation: {
      offset: offsetValidation,
    },
  });

  return (
    <Form
      isLoading={tagState.isLoading}
      navigationTitle="Add Twitch Marker"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Marker"
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Moment title"
        {...itemProps.title}
      />
      <Form.TextArea
        title="Description"
        placeholder="Optional note"
        {...itemProps.description}
      />
      <Form.TextField
        title="Offset"
        placeholder="-10s, 30s, 2m"
        {...itemProps.offset}
      />
      <Form.TagPicker id="tagIDs" title="Tags" {...itemProps.tagIDs}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function isLive(channel: MarkerTwitchChannelSummary): boolean {
  return channel.liveStatus?.toLocaleLowerCase() === "live";
}

function unavailableReason(
  channel: MarkerTwitchChannelSummary,
): string | undefined {
  if (!isLive(channel)) {
    return "Offline";
  }
  if (!channel.markerSessionID) {
    return "Live, not linked to a Marker session";
  }
  if (!channel.subSessionID) {
    return "Live, no active sub-session";
  }
  return undefined;
}

function channelMarkdown(
  channel: MarkerTwitchChannelSummary,
  canAddMarker: boolean,
): string {
  const lines = [
    `# ${channel.displayName}`,
    `**Status:** ${isLive(channel) ? "Live" : "Offline"}`,
  ];
  if (channel.streamTitle) {
    lines.push(`**Stream:** ${channel.streamTitle}`);
  }
  if (!canAddMarker) {
    lines.push(
      `**Marker unavailable:** ${unavailableReason(channel) ?? "Channel is not ready for markers."}`,
    );
  }
  return lines.join("\n\n");
}

function offsetValidation(value: string | undefined) {
  try {
    offsetSeconds(value);
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid offset.";
  }
}
