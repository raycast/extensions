import { Action, ActionPanel, Color, Detail, Icon, List, Grid, showHUD } from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate } from "../lib/utils";
import { getPrimaryActionPreference, PrimaryAction, Video } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";
import { ChannelItemDetailFetched } from "./channel";
import { getViewLayout } from "./listgrid";
import fs from "fs";
import he from "he";

function videoUrl(videoId: string | null | undefined): string | undefined {
  if (videoId) {
    return `https://youtube.com/watch?v=${videoId}`;
  }
  return undefined;
}

function CopyVideoUrlAction(props: { videoId: string | null | undefined }): JSX.Element | null {
  const url = videoUrl(props.videoId);
  if (url) {
    return (
      <Action.CopyToClipboard title="Copy Video URL" content={url} shortcut={{ modifiers: ["cmd", "opt"], key: "c" }} />
    );
  }
  return null;
}

function OpenVideoInBrowser(props: { videoId: string | null | undefined }): JSX.Element | null {
  const videoId = props.videoId;
  if (videoId) {
    return <Action.OpenInBrowser title="Open Video in Browser" url={`https://youtube.com/watch?v=${videoId}`} />;
  }
  return null;
}

function OpenWithIINAAction(props: { videoId: string | null | undefined }): JSX.Element | null {
  const url = videoUrl(props.videoId);
  if (url) {
    const appPath = "/Applications/IINA.app";
    if (fs.existsSync(appPath)) {
      return (
        <Action.Open
          title="Open with IINA"
          target={url}
          application="iina"
          icon={{ fileIcon: appPath }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onOpen={() => {
            showHUD("Open IINA");
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
  const videoId = video.id;
  const desc = video.description || "<no description>";
  const title = video.title;
  const thumbnailUrl = video.thumbnails?.high?.url || undefined;
  const thumbnailMd = (thumbnailUrl ? `![thumbnail](${thumbnailUrl})` : "") + "\n\n";
  const channel = video.channelTitle;
  const meta: string[] = [`- Channel: ${channel}  `, `- Published: ${formatDate(video.publishedAt)}`];
  const md = `# ${title}\n\n${thumbnailMd}${desc}\n\n${meta.join("\n")}`;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <OpenVideoInBrowser videoId={videoId} />
          <ShowChannelAction channelId={video.channelId} />
          <OpenChannelInBrowser channelId={video.channelId} />
          <CopyVideoUrlAction videoId={videoId} />
          <OpenWithIINAAction videoId={videoId} />
        </ActionPanel>
      }
    />
  );
}

export function VideoItem(props: { video: Video }): JSX.Element {
  const video = props.video;
  const videoId = video.id;
  let parts: string[] = [];
  if (video.statistics) {
    parts = [`${compactNumberFormat(parseInt(video.statistics.viewCount))} views · ${video.publishedAt}`];
  }
  const thumbnail = video.thumbnails?.high?.url || "";

  const maxLength = 70;
  const rawTitle = he.decode(video.title);
  const title = rawTitle.slice(0, maxLength) + (rawTitle.length > maxLength ? " ..." : "");

  const mainActions = () => {
    const showDetail = <ShowVideoDetails video={video} />;
    const openBrowser = <OpenVideoInBrowser videoId={videoId} />;

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

  return getViewLayout() === "list" ? (
    <List.Item
      key={videoId}
      title={title}
      accessories={[{ text: parts.join(" ") }]}
      icon={{ source: thumbnail }}
      actions={
        <ActionPanel>
          {mainActions()}
          <ShowChannelAction channelId={video.channelId} />
          <CopyVideoUrlAction videoId={videoId} />
          <OpenWithIINAAction videoId={videoId} />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.Item
      key={videoId}
      title={title}
      subtitle={parts.join(" ")}
      content={{ source: thumbnail }}
      actions={
        <ActionPanel>
          {mainActions()}
          <ShowChannelAction channelId={video.channelId} />
          <CopyVideoUrlAction videoId={videoId} />
          <OpenWithIINAAction videoId={videoId} />
        </ActionPanel>
      }
    />
  );
}
