import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  LaunchType,
  List,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import Playlists from "./playlists";
import { ArtistAlbums, FacetTracks } from "./libraryBrowser";
import { ToolboxPopupDiscovery, ToolboxPopupLastfm } from "./components/ToolboxActions";
import {
  activateApp,
  addTrackToQueue,
  adjustVolume,
  banOnLastFM,
  copyCoverArtFile,
  copyLyrics,
  cycleRepeat,
  cycleShuffle,
  formatMetadataMarkdown,
  formatRating,
  getExtendedTrackMetadata,
  getPlayerStatus,
  getTrackArtwork,
  loveOnLastFM,
  nextTrack,
  playpause,
  previousTrack,
  reshuffle,
  revealInFinder,
  seek,
  setRating,
  stop,
  toggleStopAfterTrack,
  type PlayerStatus,
  type Track,
  type TrackMetadata,
} from "./helpers/swinsian";

interface PopupPreferences {
  toolboxHiddenCategories?: string;
  toolboxHiddenServices?: string;
  toolboxCustomServices?: string;
  toolboxLastfmUsername?: string;
}

type RunAction = (action: () => Promise<unknown>, successMessage?: string) => Promise<void>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function launch(name: string): Promise<void> {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function NowPlaying() {
  const prefs = getPreferenceValues<PopupPreferences>();
  const { data: status, isLoading, revalidate } = useCachedPromise(getPlayerStatus, [], { keepPreviousData: true });
  const track = status?.track;
  const { data: artwork } = useCachedPromise(async (id) => (id ? getTrackArtwork(id) : undefined), [track?.id]);
  const { data: metadata } = useCachedPromise(async (id) => (id ? getExtendedTrackMetadata() : null), [track?.id], {
    keepPreviousData: false,
  });

  const run: RunAction = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) await showHUD(successMessage);
    } catch (error) {
      await showHUD(`Swinsian: ${errorMessage(error)}`);
    } finally {
      await revalidate();
    }
  };

  if (!track) {
    return (
      <List isLoading={isLoading} isShowingDetail navigationTitle="Now Playing" searchBarPlaceholder="Swinsian">
        <List.EmptyView
          icon={Icon.Music}
          title="Nothing Playing"
          description="Open Swinsian and start a track, then refresh this command."
          actions={
            <ActionPanel>
              <Action title="Open Swinsian" icon={Icon.AppWindow} onAction={activateApp} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const detail = <NowPlayingDetail track={track} status={status} artwork={artwork} metadata={metadata} />;

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Now Playing" searchBarPlaceholder="Search actions…">
      <List.Section title="Now Playing">
        <List.Item
          icon={status?.state === "playing" ? Icon.Pause : Icon.Play}
          title={track.name}
          subtitle={track.artist}
          detail={detail}
          actions={<CurrentTrackActions track={track} run={run} />}
        />
      </List.Section>

      <List.Section title="Controls">
        <List.Item
          icon={Icon.Play}
          title="Playback"
          subtitle={status?.state === "playing" ? "Playing" : status?.state === "paused" ? "Paused" : "Stopped"}
          detail={detail}
          actions={<PlaybackActions status={status} track={track} run={run} />}
        />
      </List.Section>

      <List.Section title="Library">
        <List.Item
          icon={Icon.Book}
          title="Browser"
          subtitle={track.artist || track.albumArtist || "Unknown Artist"}
          detail={detail}
          actions={<LibraryActions track={track} />}
        />
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          icon={Icon.MagnifyingGlass}
          title="Discovery"
          detail={detail}
          actions={<DiscoveryActions track={track} prefs={prefs} run={run} />}
        />
        <List.Item
          icon={Icon.Clipboard}
          title="Metadata"
          detail={detail}
          actions={<CopyActions track={track} run={run} />}
        />
        <List.Item
          icon={Icon.Hammer}
          title="Tools"
          detail={detail}
          actions={<ToolActions track={track} revalidate={revalidate} />}
        />
      </List.Section>
    </List>
  );
}

function NowPlayingDetail({
  track,
  status,
  artwork,
  metadata,
}: {
  track: Track;
  status: PlayerStatus | undefined;
  artwork: string | undefined;
  metadata: TrackMetadata | null | undefined;
}) {
  const state = status?.state ?? "stopped";
  const stateLabel = state === "playing" ? "Playing" : state === "paused" ? "Paused" : "Stopped";
  const value = (key: string): string | undefined => {
    const field = metadata?.[key];
    return field === null || field === undefined || field === "" ? undefined : String(field);
  };
  const trackNumber = value("track_number");
  const trackCount = value("track_count");
  const discNumber = value("disc_number");
  const discCount = value("disc_count");
  const playCount = value("play_count") ?? String(track.playCount);
  const bitRate = value("bit_rate") ?? (track.bitRate > 0 ? String(track.bitRate) : undefined);
  const fileType = value("kind") ?? track.kind;
  const comment = value("comment");
  const description = value("description");
  const artworkMarkdown = artwork
    ? `![Album artwork](${artwork}?raycast-width=185&raycast-height=185)`
    : "### Artwork unavailable";

  return (
    <List.Item.Detail
      markdown={artworkMarkdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Playback"
            text={`${stateLabel} • ${track.time}`}
            icon={state === "playing" ? Icon.Play : state === "paused" ? Icon.Pause : Icon.Stop}
          />
          <List.Item.Detail.Metadata.Label title="Artist" text={track.artist} />
          {track.albumArtist && track.albumArtist !== track.artist && (
            <List.Item.Detail.Metadata.Label title="Album Artist" text={track.albumArtist} />
          )}
          <List.Item.Detail.Metadata.Label title="Album" text={track.album} />
          <List.Item.Detail.Metadata.Label title="Genre" text={track.genre || "Unknown"} />
          <List.Item.Detail.Metadata.Label title="Year" text={track.year > 0 ? String(track.year) : "Unknown"} />
          <List.Item.Detail.Metadata.Label
            title="Rating"
            text={track.rating > 0 ? formatRating(track.rating) : "Not rated"}
          />
          <List.Item.Detail.Metadata.Label title="Play Count" text={playCount} />

          <List.Item.Detail.Metadata.Separator />
          {fileType && <List.Item.Detail.Metadata.Label title="File Type" text={fileType} />}
          {bitRate && <List.Item.Detail.Metadata.Label title="Bit Rate" text={`${bitRate} kbps`} />}
          {value("sample_rate") && (
            <List.Item.Detail.Metadata.Label title="Sample Rate" text={`${value("sample_rate")} Hz`} />
          )}
          {value("bit_depth") && (
            <List.Item.Detail.Metadata.Label title="Bit Depth" text={`${value("bit_depth")} bits`} />
          )}
          {value("encoder") && <List.Item.Detail.Metadata.Label title="Encoder" text={value("encoder")} />}
          {value("bpm") && <List.Item.Detail.Metadata.Label title="BPM" text={value("bpm")} />}

          <List.Item.Detail.Metadata.Separator />
          {trackNumber && (
            <List.Item.Detail.Metadata.Label
              title="Track"
              text={trackCount ? `${trackNumber} of ${trackCount}` : trackNumber}
            />
          )}
          {discNumber && (
            <List.Item.Detail.Metadata.Label
              title="Disc"
              text={discCount ? `${discNumber} of ${discCount}` : discNumber}
            />
          )}
          {value("composer") && <List.Item.Detail.Metadata.Label title="Composer" text={value("composer")} />}
          {value("grouping") && <List.Item.Detail.Metadata.Label title="Grouping" text={value("grouping")} />}
          {value("publisher") && <List.Item.Detail.Metadata.Label title="Publisher" text={value("publisher")} />}
          {value("catalog_number") && (
            <List.Item.Detail.Metadata.Label title="Catalog Number" text={value("catalog_number")} />
          )}
          {value("barcode") && <List.Item.Detail.Metadata.Label title="Barcode" text={value("barcode")} />}
          {value("conductor") && <List.Item.Detail.Metadata.Label title="Conductor" text={value("conductor")} />}
          {value("copyright") && <List.Item.Detail.Metadata.Label title="Copyright" text={value("copyright")} />}

          {(comment || description) && <List.Item.Detail.Metadata.Separator />}
          {comment && <List.Item.Detail.Metadata.Label title="Comment" text={comment} />}
          {description && <List.Item.Detail.Metadata.Label title="Description" text={description} />}

          <List.Item.Detail.Metadata.Separator />
          {value("last_played") && <List.Item.Detail.Metadata.Label title="Last Played" text={value("last_played")} />}
          {value("date_added") && <List.Item.Detail.Metadata.Label title="Date Added" text={value("date_added")} />}
          {value("date_modified") && (
            <List.Item.Detail.Metadata.Label title="Date Modified" text={value("date_modified")} />
          )}
          <List.Item.Detail.Metadata.Label title="File" text={track.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function CurrentTrackActions({ track, run }: { track: Track; run: RunAction }) {
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Track Actions…" icon={Icon.Music}>
        <Action.Push title="Add to Playlist" icon={Icon.Plus} target={<Playlists trackToAdd={track} />} />
        <Action
          title="Add to Queue"
          icon={Icon.Plus}
          onAction={() => run(() => addTrackToQueue(track.path, track.id), "Added current track to queue")}
        />
        <RatingSubmenu track={track} run={run} />
        <Action title="Love on Last.fm" icon={Icon.Heart} onAction={() => run(loveOnLastFM)} />
        <Action title="Reveal Track in Finder" icon={Icon.Finder} onAction={() => revealInFinder(track.path)} />
        <ActionPanel.Section title="More">
          <Action title="Ban on Last.fm" icon={Icon.XMarkCircle} onAction={() => run(banOnLastFM)} />
        </ActionPanel.Section>
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

function RatingSubmenu({ track, run }: { track: Track; run: RunAction }) {
  return (
    <ActionPanel.Submenu title={`Rating: ${track.rating > 0 ? formatRating(track.rating) : "None"}`} icon={Icon.Star}>
      {[0, 1, 2, 3, 4, 5].map((rating) => (
        <Action
          key={rating}
          title={rating === 0 ? "Clear Rating" : `${rating} Star${rating === 1 ? "" : "s"}`}
          icon={Icon.Star}
          onAction={() => run(() => setRating(rating), "Rating updated")}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function PlaybackActions({ status, track, run }: { status: PlayerStatus | undefined; track: Track; run: RunAction }) {
  const shuffleLabel = status?.shuffle === "none" ? "Off" : status?.shuffle === "track shuffle" ? "Track" : "Album";
  const repeatLabel = status?.repeatSingle ? "Single" : status?.repeatQueue ? "Queue" : "Off";
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Playback…" icon={Icon.Play}>
        <ActionPanel.Section title="Transport">
          <Action
            title={status?.state === "playing" ? "Pause" : "Play"}
            icon={status?.state === "playing" ? Icon.Pause : Icon.Play}
            onAction={() => run(playpause)}
          />
          <Action title="Next Track" icon={Icon.Forward} onAction={() => run(nextTrack)} />
          <Action title="Previous Track" icon={Icon.Rewind} onAction={() => run(previousTrack)} />
          <Action title="Stop" icon={Icon.Stop} onAction={() => run(stop)} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Seek">
          <Action title="Step Backward" icon={Icon.RewindFilled} onAction={() => run(() => seek(-15))} />
          <Action title="Step Forward" icon={Icon.Forward} onAction={() => run(() => seek(15))} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Volume">
          <Action title="Increase Volume" icon={Icon.SpeakerHigh} onAction={() => run(() => adjustVolume(10))} />
          <Action title="Decrease Volume" icon={Icon.SpeakerLow} onAction={() => run(() => adjustVolume(-10))} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Queue">
          <Action
            title="Add Current Track to Queue"
            icon={Icon.Plus}
            onAction={() => run(() => addTrackToQueue(track.path, track.id), "Added current track to queue")}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Modes">
          <Action title={`Shuffle: ${shuffleLabel}`} icon={Icon.Shuffle} onAction={() => run(cycleShuffle)} />
          <Action title={`Repeat: ${repeatLabel}`} icon={Icon.Repeat} onAction={() => run(cycleRepeat)} />
          <Action
            title={status?.stopAfterTrack ? "Disable Stop After Track" : "Enable Stop After Track"}
            icon={Icon.Stop}
            onAction={() => run(toggleStopAfterTrack)}
          />
          <Action title="Reshuffle Queue" icon={Icon.Shuffle} onAction={() => run(reshuffle)} />
        </ActionPanel.Section>
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

function LibraryActions({ track }: { track: Track }) {
  const artist = track.artist || track.albumArtist || "Unknown Artist";
  const albumArtist = track.albumArtist || track.artist;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Current Track">
        <Action.Push
          title={`Browse Albums by ${artist}`}
          icon={Icon.Person}
          target={
            <ArtistAlbums
              mode="artist"
              facet={{ value: artist, title: artist, subtitle: track.genre || undefined, count: 0 }}
            />
          }
        />
        {track.album && (
          <Action.Push
            title={`Browse ${track.album}`}
            icon={Icon.Cd}
            target={
              <FacetTracks
                mode="album"
                facet={{
                  value: track.album,
                  title: track.album,
                  subtitle: `${albumArtist}${track.year > 0 ? ` • ${track.year}` : ""}`,
                  count: 0,
                }}
              />
            }
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Library">
        <ActionPanel.Submenu title="Other Library Destinations…" icon={Icon.Book}>
          <Action title="Browse Library" icon={Icon.Book} onAction={() => launch("libraryBrowser")} />
          <Action title="Quick Search" icon={Icon.MagnifyingGlass} onAction={() => launch("search")} />
          <Action title="Browse Playlists" icon={Icon.List} onAction={() => launch("playlists")} />
          <Action.Push
            title="Add Current Track to Playlist"
            icon={Icon.Plus}
            target={<Playlists trackToAdd={track} />}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function DiscoveryActions({ track, prefs, run }: { track: Track; prefs: PopupPreferences; run: RunAction }) {
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Discovery…" icon={Icon.MagnifyingGlass}>
        <ToolboxPopupDiscovery
          track={track}
          hiddenCategories={prefs.toolboxHiddenCategories}
          hiddenServices={prefs.toolboxHiddenServices}
          customServices={prefs.toolboxCustomServices}
          lastfmUsername={prefs.toolboxLastfmUsername}
        />
        <ToolboxPopupLastfm
          track={track}
          hiddenCategories={prefs.toolboxHiddenCategories}
          hiddenServices={prefs.toolboxHiddenServices}
          customServices={prefs.toolboxCustomServices}
          lastfmUsername={prefs.toolboxLastfmUsername}
        />
        <ActionPanel.Section title="Current Track">
          <Action title="Love on Last.fm" icon={Icon.Heart} onAction={() => run(loveOnLastFM)} />
          <Action title="Ban on Last.fm" icon={Icon.XMarkCircle} onAction={() => run(banOnLastFM)} />
        </ActionPanel.Section>
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

function CopyActions({ track, run }: { track: Track; run: RunAction }) {
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Copy & Files…" icon={Icon.Clipboard}>
        <ActionPanel.Section title="Text">
          <Action.CopyToClipboard
            title="Artist – Track"
            content={`${track.artist} – ${track.name}`}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Artist – Album – Track"
            content={`${track.artist} – ${track.album} – ${track.name}`}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard title="Copy File Path" content={track.path} icon={Icon.Document} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Metadata">
          <Action
            title="Copy Metadata as JSON"
            icon={Icon.Code}
            onAction={async () => {
              const metadata = await getExtendedTrackMetadata();
              if (metadata) {
                await Clipboard.copy(JSON.stringify(metadata, null, 2));
                await showHUD("JSON metadata copied");
              }
            }}
          />
          <Action
            title="Copy Metadata as Markdown"
            icon={Icon.TextDocument}
            onAction={async () => {
              const metadata = await getExtendedTrackMetadata();
              if (metadata) {
                await Clipboard.copy(formatMetadataMarkdown(metadata));
                await showHUD("Markdown metadata copied");
              }
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Artwork & Lyrics">
          <Action title="Copy Cover Art" icon={Icon.Image} onAction={() => run(copyCoverArtFile)} />
          <Action title="Copy Lyrics" icon={Icon.TextDocument} onAction={() => run(copyLyrics)} />
        </ActionPanel.Section>
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

function ToolActions({ track, revalidate }: { track: Track; revalidate: () => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Tools…" icon={Icon.Hammer}>
        <Action title="Reveal Track in Finder" icon={Icon.Finder} onAction={() => revealInFinder(track.path)} />
        <Action title="Open Swinsian" icon={Icon.AppWindow} onAction={activateApp} />
        <Action title="Refresh Now Playing" icon={Icon.RotateClockwise} onAction={revalidate} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}
