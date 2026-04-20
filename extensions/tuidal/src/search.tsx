import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import {
  api,
  artistNames,
  formatDuration,
  playTrack,
  qualityIcon,
} from "./api";
import type { Track } from "./types";

export default function Search() {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      setResults(await api.search(q));
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tuidal not running",
      });
    } finally {
      setLoading(false);
    }
  }

  async function play(track: Track) {
    try {
      await playTrack(track);
      await showToast({
        style: Toast.Style.Success,
        title: `▶ ${track.title}`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tuidal not running",
      });
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search Tidal…"
      onSearchTextChange={search}
      throttle
    >
      {results.map((track) => (
        <List.Item
          key={track.id}
          icon={qualityIcon(track.audio_quality)}
          title={track.title}
          subtitle={artistNames(track.artists)}
          accessories={[
            { text: track.album.title },
            { text: formatDuration(track.duration) },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Play"
                icon={Icon.Play}
                onAction={() => play(track)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
