import { Action, ActionPanel, Color, Detail, Icon, List, Grid, showHUD, getPreferenceValues } from "@raycast/api";
import React from "react";
import { compactNumberFormat, formatDate } from "../lib/utils";
import { Video } from "../lib/youtubeapi";
import { OpenChannelInBrowser } from "./actions";
import { ChannelItemDetailFetched } from "./channel";
import { addRecentVideo } from "./recent_videos";
import fs from "fs";
import he from "he";
import { ViewLayout, PrimaryAction, Preferences } from "../lib/types";

const { view, primaryaction } = getPreferenceValues<Preferences>();

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
        onCopy={() => addRecentVideo(props.video)}
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
        onOpen={() => addRecentVideo(props.video)}
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
            () => addRecentVideo(props.video);
          }}
        />
      );
    }
  }
  return null;
}

function ShowVideoDetails({ video }: { video: Video }): JSX.Element {
  return (
    <Action.Push
      title="Show Details"
      target={<VideoItemDetail video={video} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      onPush={() => addRecentVideo(video)}
    />
  );
}

function ShowChannelAction({ channelId }: { channelId: string | undefined }): JSX.Element | null {
  if (channelId) {
    return (
      <Action.Push
        title="Show Channel"
        target={<ChannelItemDetailFetched channelId={channelId} />}
        icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    );
  }
  return null;
}

export function VideoItemDetail({ video }: { video: Video }): JSX.Element {
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
            <OpenVideoInBrowser video={video} />
            <ShowChannelAction channelId={video.channelId} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenChannelInBrowser channelId={video.channelId} />
            <CopyVideoUrlAction video={video} />
            <OpenWithIINAAction video={video} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function VideoItem({ video, actions }: { video: Video; actions?: JSX.Element | undefined }): JSX.Element {
  let parts: string[] = [];
  if (video.statistics) {
    parts = [`${compactNumberFormat(parseInt(video.statistics.viewCount))} views · ${formatDate(video.publishedAt)}`];
  }
  const thumbnail = video.thumbnails?.high?.url || "";
  const title = he.decode(video.title);

  const Actions = (): JSX.Element => {
    const showDetail = <ShowVideoDetails video={video} />;
    const openBrowser = <OpenVideoInBrowser video={video} />;
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
          <CopyVideoUrlAction video={video} />
          <OpenWithIINAAction video={video} />
        </ActionPanel.Section>
        {actions}
      </ActionPanel>
    );
  };

  return view === ViewLayout.List ? (
    <List.Item
      key={video.id}
      title={title}
      accessories={[{ text: parts.join(" ") }]}
      icon={{ source: thumbnail }}
      actions={<Actions />}
    />
  ) : (
    <Grid.Item
      key={video.id}
      title={title}
      subtitle={parts.join(" ")}
      content={{ source: thumbnail }}
      actions={<Actions />}
    />
  );
}
