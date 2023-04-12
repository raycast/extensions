import { Action, ActionPanel, Color, Detail, Icon, List, Grid, showHUD, Toast, showToast } from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate } from "../lib/utils";
import { getPrimaryActionPreference, PrimaryAction, Video } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";
import { ChannelItemDetailFetched } from "./channel";
import { getViewLayout } from "./listgrid";
import { addRecentVideo } from "./recent_videos";
import fs from "fs";
import he from "he";

function videoUrl(videoId: string | null | undefined): string | undefined {
  if (videoId) {
    return `https://youtube.com/watch?v=${videoId}`;
  }
  return undefined;
}

function CopyVideoUrlAction(props: { video: Video }): JSX.Element | null {
  const url = videoUrl(props.video.id);
  if (url) {
    return (
      <Action.CopyToClipboard
        title="Copy Video URL"
        content={url}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        onCopy={async () => await addRecentVideo(props.video)}
      />
    );
  }
  return null;
}

function OpenVideoInBrowser(props: { video: Video }): JSX.Element | null {
  const videoId = props.video.id;
  if (videoId) {
    return (
      <Action.OpenInBrowser
        title="Open Video in Browser"
        url={`https://youtube.com/watch?v=${videoId}`}
        onOpen={async () => await addRecentVideo(props.video)}
      />
    );
  }
  return null;
}

function OpenWithIINAAction(props: { video: Video }): JSX.Element | null {
  const url = videoUrl(props.video.id);
  if (url) {
    const appPath = "/Applications/IINA.app";
    if (fs.existsSync(appPath)) {
      return (
        <Action.Open
          title="Open with IINA"
          target={url}
          application="IINA"
          icon={{ fileIcon: appPath }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onOpen={() => {
            showHUD("Open IINA");
            async () => await addRecentVideo(props.video);
          }}
        />
      );
    }
  }
  return null;
}

function ShowVideoDetails(props: { video: Video }): JSX.Element {
  const video = props.video;
  return (
    <Action.Push
      title="Show Details"
      target={<VideoItemDetail video={video} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      onPush={async () => await addRecentVideo(props.video)}
    />
  );
}

function ShowChannelAction(props: { channelId: string | undefined }): JSX.Element | null {
  const cid = props.channelId;
  if (cid) {
    return (
      <Action.Push
        title="Show Channel"
        target={<ChannelItemDetailFetched channelId={cid} />}
        icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    );
  }
  return null;
}

export function VideoItemDetail(props: { video: Video }): JSX.Element {
  const video = props.video;
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
            <OpenVideoInBrowser video={props.video} />
            <ShowChannelAction channelId={video.channelId} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenChannelInBrowser channelId={video.channelId} />
            <CopyVideoUrlAction video={video} />
            <OpenWithIINAAction video={props.video} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function VideoItem(props: { video: Video; actions?: JSX.Element | undefined }): JSX.Element {
  const video = props.video;
  const videoId = video.id;
  let parts: string[] = [];
  if (video.statistics) {
    parts = [`${compactNumberFormat(parseInt(video.statistics.viewCount))} views · ${formatDate(video.publishedAt)}`];
  }
  const thumbnail = video.thumbnails?.high?.url || "";

  const title = he.decode(video.title);

  const mainActions = () => {
    const showDetail = <ShowVideoDetails video={video} />;
    const openBrowser = <OpenVideoInBrowser video={video} />;

    if (getPrimaryActionPreference() === PrimaryAction.Browser) {
      return (
        <React.Fragment>
          {openBrowser}
          {showDetail}
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {showDetail}
          {openBrowser}
        </React.Fragment>
      );
    }
  };

  const Actions = (): JSX.Element => {
    return (
      <ActionPanel>
        <ActionPanel.Section>{mainActions()}</ActionPanel.Section>
        <ActionPanel.Section>
          <ShowChannelAction channelId={video.channelId} />
          <CopyVideoUrlAction video={video} />
          <OpenWithIINAAction video={video} />
        </ActionPanel.Section>
        <ActionPanel.Section>{props.actions}</ActionPanel.Section>
      </ActionPanel>
    );
  };

  return getViewLayout() === "list" ? (
    <List.Item
      key={videoId}
      title={title}
      accessories={[{ text: parts.join(" ") }]}
      icon={{ source: thumbnail }}
      actions={<Actions />}
    />
  ) : (
    <Grid.Item
      key={videoId}
      title={title}
      subtitle={parts.join(" ")}
      content={{ source: thumbnail }}
      actions={<Actions />}
    />
  );
}
