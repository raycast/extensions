import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { controlSource, getMediaSources } from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import type { MediaSource } from "./core/types";
import { formatTime } from "./lib/format";
import { refreshMenuBar } from "./lib/refreshMenuBar";

registerAllProviders();

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(() => getMediaSources());

  useEffect(() => {
    const t = setInterval(() => revalidate(), 2000);
    return () => clearInterval(t);
  }, [revalidate]);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && data.sources.length === 0 && (
        <List.EmptyView
          icon={Icon.Music}
          title="Nothing playing"
          description={
            data.engineAvailable
              ? "Start playback in any app."
              : "Install media-control for full app coverage: brew install media-control"
          }
        />
      )}
      {data?.sources.map((s) => (
        <List.Item
          key={s.id}
          icon={s.artworkPath ? { source: s.artworkPath } : Icon.Music}
          title={s.title}
          subtitle={s.artist}
          accessories={[
            { tag: s.appName },
            {
              text: s.duration
                ? `${formatTime(s.position)} / ${formatTime(s.duration)}`
                : undefined,
            },
            { icon: s.isPlaying ? Icon.Play : Icon.Pause },
          ]}
          detail={<ItemDetail source={s} />}
          actions={
            <ActionPanel>
              <Action
                title={s.isPlaying ? "Pause" : "Play"}
                icon={s.isPlaying ? Icon.Pause : Icon.Play}
                onAction={async () => {
                  await controlSource(s, "playpause");
                  revalidate();
                  await refreshMenuBar();
                }}
              />
              <Action
                title="Next Track"
                icon={Icon.Forward}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={async () => {
                  await controlSource(s, "next");
                  revalidate();
                  await refreshMenuBar();
                }}
              />
              <Action
                title="Previous Track"
                icon={Icon.Rewind}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={async () => {
                  await controlSource(s, "previous");
                  revalidate();
                  await refreshMenuBar();
                }}
              />
              {s.url && <Action.OpenInBrowser url={s.url} />}
              <Action.CopyToClipboard
                title="Copy Title — Artist"
                content={`${s.title} — ${s.artist ?? ""}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ItemDetail(props: { source: MediaSource }) {
  const { source: s } = props;
  const art = s.artworkPath
    ? `![artwork](file://${s.artworkPath}?raycast-height=280)\n\n`
    : "";
  return (
    <List.Item.Detail
      markdown={`${art}# ${s.title}\n\n**${s.artist ?? "Unknown artist"}**${s.album ? ` — _${s.album}_` : ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="App" text={s.appName} />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={s.isPlaying ? "Playing" : "Paused"}
          />
          {s.duration !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Position"
              text={`${formatTime(s.position)} / ${formatTime(s.duration)}`}
            />
          )}
          {s.album && (
            <List.Item.Detail.Metadata.Label title="Album" text={s.album} />
          )}
          <List.Item.Detail.Metadata.Label title="Source" text={s.origin} />
          {s.url && (
            <List.Item.Detail.Metadata.Link
              title="URL"
              target={s.url}
              text="Open"
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
