import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  api,
  artistNames,
  formatDuration,
  playTrack,
  qualityIcon,
} from "./api";
import type { QueueResponse, Track } from "./types";

export default function Queue() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setData(await api.queue());
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tuidal not running",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function play(track: Track) {
    try {
      await playTrack(track);
      await showToast({
        style: Toast.Style.Success,
        title: `▶ ${track.title}`,
      });
      setTimeout(refresh, 500);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tuidal not running",
      });
    }
  }

  const tracks = data?.tracks ?? [];
  const currentIdx = data?.current_index;

  return (
    <List isLoading={loading} navigationTitle={`Queue (${tracks.length})`}>
      {tracks.length === 0 && !loading ? (
        <List.EmptyView
          icon={Icon.Music}
          title="Queue is empty"
          description="Search for tracks to start playing."
        />
      ) : (
        tracks.map((track, i) => {
          const isCurrent = i === currentIdx;
          return (
            <List.Item
              key={`${track.id}-${i}`}
              icon={
                isCurrent
                  ? { source: Icon.Play, tintColor: Color.Green }
                  : qualityIcon(track.audio_quality)
              }
              title={track.title}
              subtitle={artistNames(track.artists)}
              accessories={[
                ...(isCurrent
                  ? [{ tag: { value: "Playing", color: Color.Green } }]
                  : []),
                { text: formatDuration(track.duration) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Play"
                    icon={Icon.Play}
                    onAction={() => play(track)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
