import { Action, ActionPanel, Color, Detail, Grid, Icon, List, getPreferenceValues, showHUD } from "@raycast/api";
import fs from "fs";
import he from "he";
import React from "react";
import { Preferences, PrimaryAction, ViewLayout } from "../lib/types";
import { compactNumberFormat, formatDate } from "../lib/utils";
import { Video } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";
import { ChannelItemDetailFetched } from "./channel";
import { PinVideo, PinnedVideoActions, RecentVideoActions, addRecentVideo } from "./recent_videos";

export interface VideoActionProps {
  video: Video;
  refresh?: () => void;
}

function videoUrl(videoId: string) {
  return `https://youtube.com/watch?v=${videoId}`;
}

function CopyVideoUrlAction({ video, refresh }: VideoActionProps) {
  return (
    <Action.CopyToClipboard
      title="Copy Video URL"
      content={videoUrl(video.id)}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      onCopy={() => {
        addRecentVideo(video.id);
        if (refresh) refresh();
      }}
    />
  );
}

function OpenVideoInBrowser({ video }: VideoActionProps) {
  return (
    <Action.OpenInBrowser
      title="Open Video in Browser"
      url={videoUrl(video.id)}
      onOpen={() => addRecentVideo(video.id)}
    />
  );
}

function OpenWithIINAAction({ video, refresh }: VideoActionProps): JSX.Element | null {
  const appPath = "/Applications/IINA.app";
  if (fs.existsSync(appPath)) {
    return (
      <Action.Open
        title="Open with IINA"
        target={videoUrl(video.id)}
        application="IINA"
        icon={{ fileIcon: appPath }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onOpen={() => {
          showHUD("Open IINA");
          addRecentVideo(video.id);
          if (refresh) refresh();
        }}
      />
    );
  }
  return null;
}

function ShowVideoDetails(props: VideoActionProps) {
  const { video, refresh } = props;
  return (
    <Action.Push
      title="Show Details"
      target={<VideoItemDetail {...props} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      onPush={() => {
        addRecentVideo(video.id);
        if (refresh) refresh();
      }}
    />
  );
}

function ShowChannelAction(props: { channelId: string }) {
  return (
    <Action.Push
      title="Show Channel"
      target={<ChannelItemDetailFetched {...props} />}
      icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  );
}

export function VideoItemDetail(props: VideoActionProps): JSX.Element {
  const { video } = props;
  const statistics = video.statistics;
  const desc = video.description || "No description";
  const title = video.title;
  const thumbnailUrl = video.thumbnails?.high?.url || undefined;
  const thumbnailMd = (thumbnailUrl ? `![thumbnail](${thumbnailUrl})` : "") + "\n\n";
  const channel = video.channelTitle;
  const md = `# ${title}\n\n${thumbnailMd}${desc}\n\n`;
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Channel" text={channel} />
          <Detail.Metadata.Label title="Published" text={formatDate(video.publishedAt)} />
          <Detail.Metadata.Label title="Duration" text={video.duration} />
          <Detail.Metadata.Separator />
          {statistics && (
            <React.Fragment>
              <Detail.Metadata.Label title="Views" text={compactNumberFormat(parseInt(statistics.viewCount))} />
              <Detail.Metadata.Label title="Likes" text={compactNumberFormat(parseInt(statistics.likeCount))} />
              <Detail.Metadata.Label title="Comments" text={compactNumberFormat(parseInt(statistics.commentCount))} />
            </React.Fragment>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open Video in Browser"
            target={`https://youtube.com/watch?v=${video.id}`}
            text={"Watch"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenVideoInBrowser {...props} />
            <ShowChannelAction channelId={video.channelId} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenChannelInBrowser channelId={video.channelId} />
            <CopyVideoUrlAction {...props} />
            <OpenWithIINAAction {...props} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface VideoItemProps {
  video: Video;
  refresh?: () => void;
  pinned?: boolean;
  recent?: boolean;
}

export function VideoItem(props: VideoItemProps): JSX.Element {
  const { view, primaryaction } = getPreferenceValues<Preferences>();
  const { video } = props;
  let parts: string[] = [];
  if (video.statistics) {
    parts = [`${compactNumberFormat(parseInt(video.statistics.viewCount))} views · ${formatDate(video.publishedAt)}`];
  }
  const thumbnail = video.thumbnails?.high?.url || "";
  const title = he.decode(video.title);

  const Actions = (): JSX.Element => {
    const showDetail = <ShowVideoDetails {...props} />;
    const openBrowser = <OpenVideoInBrowser {...props} />;
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {primaryaction === PrimaryAction.OpenInBrowser ? (
            <React.Fragment>
              {openBrowser}
              {showDetail}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {showDetail}
              {openBrowser}
            </React.Fragment>
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <ShowChannelAction channelId={video.channelId} />
          <CopyVideoUrlAction {...props} />
          <OpenWithIINAAction {...props} />
        </ActionPanel.Section>
        {props.recent && <RecentVideoActions {...props} />}
        {!props.recent && (!props.pinned ? <PinVideo {...props} /> : <PinnedVideoActions {...props} />)}
      </ActionPanel>
    );
  };

  return view === ViewLayout.List ? (
    <List.Item
      key={video.id}
      title={{ value: title, tooltip: title }}
      accessories={[{ text: parts.join(" ") }]}
      icon={{ source: thumbnail }}
      actions={<Actions />}
    />
  ) : (
    <Grid.Item
      key={video.id}
      title={title}
      subtitle={parts.join(" ")}
      content={{ value: thumbnail, tooltip: title }}
      actions={<Actions />}
    />
  );
}
