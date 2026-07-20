import { ActionPanel, Icon, List } from "@raycast/api";

import { formatTrackDisplayTitle, getTrackRatingDisplayMode } from "./format";
import { getRecentlyPlayed } from "./plex";
import {
  NowPlayingAction,
  PlaybackActionItems,
  PreferencesAction,
  artworkSource,
  trackAccessories,
  usePlaybackActions,
} from "./shared-ui";
import { PlexSetupView } from "./plex-setup-view";
import { useAsyncValue } from "./use-async-value";
import { useLibrarySelection } from "./use-library-selection";
import type { MusicTrack, PlayableItem } from "./types";

function RecentTrackRow(props: {
  track: MusicTrack;
  onPlay: (item: PlayableItem) => Promise<void>;
  onPlayNext: (item: PlayableItem) => Promise<void>;
  onQueue: (item: PlayableItem) => Promise<void>;
}) {
  const ratingDisplayMode = getTrackRatingDisplayMode();

  return (
    <List.Item
      key={props.track.ratingKey}
      icon={artworkSource(props.track.thumb)}
      title={formatTrackDisplayTitle(props.track.title, {
        userRating: props.track.userRating,
        displayMode: ratingDisplayMode,
      })}
      subtitle={[props.track.grandparentTitle, props.track.parentTitle].filter(Boolean).join(" — ")}
      accessories={trackAccessories(props.track)}
      actions={
        <ActionPanel>
          <PlaybackActionItems
            item={props.track}
            onPlay={props.onPlay}
            onPlayNext={props.onPlayNext}
            onQueue={props.onQueue}
            nowPlayingShortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const libraries = useLibrarySelection();
  const selectedLibrary = libraries.selectedLibrary;

  const tracks = useAsyncValue(
    () => (selectedLibrary ? getRecentlyPlayed(selectedLibrary.key) : Promise.resolve([])),
    selectedLibrary?.key ?? "no-library",
    [] as MusicTrack[],
    selectedLibrary ? `recently-played-${selectedLibrary.key}` : undefined,
  );
  const playback = usePlaybackActions();

  const isLoading = libraries.isLoading || tracks.isLoading || playback.isPerforming;

  if (libraries.isLoading) {
    return <List isLoading navigationTitle="Recently Played" />;
  }

  if (libraries.error || !selectedLibrary) {
    return (
      <PlexSetupView
        navigationTitle="Recently Played"
        problem={libraries.error}
        onConfigured={() => {
          void libraries.reload();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Recently Played"
      searchBarPlaceholder="Filter recently played"
      actions={
        <ActionPanel>
          <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {tracks.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load recently played"
          description={tracks.error}
          actions={
            <ActionPanel>
              <NowPlayingAction shortcut={{ modifiers: ["cmd"], key: "n" }} />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
      {!tracks.isLoading && tracks.value.length === 0 && !tracks.error ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recently played tracks"
          description="Play some music to see your history here."
        />
      ) : null}
      {tracks.value.map((track) => (
        <RecentTrackRow
          key={track.ratingKey}
          track={track}
          onPlay={playback.play}
          onPlayNext={playback.playNext}
          onQueue={playback.queue}
        />
      ))}
    </List>
  );
}
