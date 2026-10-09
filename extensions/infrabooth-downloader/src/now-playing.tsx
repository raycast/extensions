import { ActionPanel, Icon, Image, List } from "@raycast/api";
import type { ReactNode } from "react";
import { NowPlayingActions } from "./components/NowPlayingActions";
import { NowPlayingDetail } from "./components/NowPlayingDetail";
import { OpenAppAction } from "./components/OpenAppAction";
import { useLiveState } from "./hooks/useLiveState";
import { APP_NOT_RUNNING_TITLE } from "./lib/feedback";
import type { RemoteState, RemoteTrack } from "@/lib/remote-protocol";
import { buildQueueSections } from "./lib/queueSections";

function OpenAppList({ title, icon }: { title: string; icon: Image.ImageLike }) {
  return (
    <List navigationTitle="Now Playing">
      <List.EmptyView
        icon={icon}
        title={title}
        actions={
          <ActionPanel>
            <OpenAppAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

interface QueueItemProps {
  state: RemoteState;
  track: RemoteTrack;
  index: number;
  title: string;
  detail: ReactNode;
}

function QueueItem({ state, track, index, title, detail }: QueueItemProps) {
  return (
    <List.Item
      id={String(index)}
      title={title}
      subtitle={track.artist}
      keywords={[track.artist]}
      icon={track.artworkUrl ?? Icon.Music}
      detail={detail}
      actions={<NowPlayingActions state={state} track={track} index={index} />}
    />
  );
}

function NowPlayingList({ state, currentTrack }: { state: RemoteState; currentTrack: RemoteTrack }) {
  const detail = <NowPlayingDetail state={state} track={currentTrack} />;
  const { history, upcoming } = buildQueueSections(state);

  return (
    <List navigationTitle="Now Playing" isShowingDetail selectedItemId={String(state.cursor)}>
      {history.length > 0 && (
        <List.Section>
          {history.map(({ track, index }) => (
            <QueueItem
              key={`${track.trackId}-${index}`}
              state={state}
              track={track}
              index={index}
              title={`${index + 1}. ${track.title}`}
              detail={detail}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Now Playing">
        <QueueItem state={state} track={currentTrack} index={state.cursor} title={currentTrack.title} detail={detail} />
      </List.Section>
      {upcoming.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.entries.map(({ track, index }) => (
            <QueueItem
              key={`${track.trackId}-${index}`}
              state={state}
              track={track}
              index={index}
              title={`${index + 1}. ${track.title}`}
              detail={detail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function NowPlaying() {
  const { live, isLoading } = useLiveState();

  if (!live) return <List isLoading={isLoading} navigationTitle="Now Playing" />;
  if (!live.running) return <OpenAppList icon={Icon.ExclamationMark} title={APP_NOT_RUNNING_TITLE} />;

  const { state } = live;
  if (!state || state.state === "stopped" || !state.currentTrack) {
    return <OpenAppList icon={Icon.Music} title="Nothing playing" />;
  }

  return <NowPlayingList state={state} currentTrack={state.currentTrack} />;
}
