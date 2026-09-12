import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import { readNowPlayingTrackId, type Album, type QobuzClient, type Track } from "@kud/qobuz";
import { useState } from "react";
import { appLink, BRAND, deepLink, formatDuration, getClient } from "./lib/client";
import {
  deezerByIsrc,
  findIsrc,
  isLikelyMatch,
  resolveLink,
  spotifySearchUrl,
  ytMusicSearchUrl,
  type ResolveFailure,
  type ResolvedTrack,
} from "./lib/resolve";

type Source = "clipboard" | "now-playing";

// Where the input came from, and whether the other source is available to
// switch to. nowPlayingId is only set when the clipboard won, so the panel can
// offer the currently playing track as an alternative.
type Input = { source: Source; nowPlayingId?: number };

type ToQobuz = Input & {
  mode: "to-qobuz";
  resolved: ResolvedTrack;
  track: Track | null;
  album: Album | null;
  exact: boolean;
};

type FromQobuz = Input & {
  mode: "from-qobuz";
  track: Track;
  album: Album | null;
  query: string;
  deezerUrl?: string;
};

type Conversion = { mode: "empty" } | { mode: "error"; reason: ResolveFailure } | ToQobuz | FromQobuz;

const SUPPORTED_HINT =
  "Copy a **Spotify**, **YouTube Music**, or **Qobuz** track link — or play something in Qobuz — then run this command.";

// A clipboard that is not a track link from a known service says nothing about
// intent, so the currently playing track takes over. A link from a known
// service of the wrong kind (album, playlist) is a deliberate paste and keeps
// its error instead.
const YIELDS_TO_NOW_PLAYING: ReadonlySet<ResolveFailure> = new Set(["invalid", "unknown"]);

const UNRESOLVED_MESSAGE: Record<ResolveFailure, string> = {
  invalid: ["# Nothing to convert", "", SUPPORTED_HINT].join("\n"),
  qobuz: ["# Unsupported Qobuz link", "", SUPPORTED_HINT].join("\n"),
  "unsupported-type": [
    "# Need a track link",
    "",
    `That looks like an album, playlist, artist, or podcast. Paste a single **track** link.`,
  ].join("\n"),
  unknown: ["# Unsupported link", "", SUPPORTED_HINT].join("\n"),
};

// Reverse: a Qobuz track → links on the other services.
const convertFromQobuz = async (client: QobuzClient, trackId: number): Promise<Omit<FromQobuz, keyof Input>> => {
  const track = await client.tracks.get(trackId);
  const album = track.album?.id ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null) : null;
  const query = `${track.artist?.name ?? ""} ${track.title}`.trim();
  const deezerUrl = track.isrc ? await deezerByIsrc(track.isrc) : undefined;
  return { mode: "from-qobuz", track, album, query, deezerUrl };
};

// Forward: a foreign track → the matching Qobuz track.
const convertToQobuz = async (client: QobuzClient, resolved: ResolvedTrack): Promise<Omit<ToQobuz, keyof Input>> => {
  const query = `${resolved.artist} ${resolved.title}`;
  const isrc = await findIsrc(resolved);

  let track = isrc ? ((await client.tracks.match({ isrc, query })) ?? null) : null;
  const exact = Boolean(track);

  if (!track) {
    // Approximate fallback: only trust a candidate that actually resembles
    // the source, so a track absent from Qobuz reports "no match" rather
    // than a confident wrong result.
    const candidates = (await client.search.search(query, { limit: 5 })).tracks;
    track = candidates.find((c) => isLikelyMatch(resolved, c)) ?? null;
  }

  const album = track?.album?.id ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null) : null;

  return { mode: "to-qobuz", resolved, track, album, exact };
};

// Precedence: a usable track link on the clipboard wins, the track Qobuz is
// currently on fills in otherwise. Qobuz's state file carries no playing flag,
// only a queue position — so "is something playing" cannot be detected, and
// putting now-playing first would make the clipboard unreachable on any machine
// with a queue.
const convert = async (preferNowPlaying: boolean): Promise<Conversion> => {
  const nowPlayingId = await readNowPlayingTrackId();
  const convertNowPlaying = async (trackId: number): Promise<Conversion> => ({
    ...(await convertFromQobuz(await getClient(), trackId)),
    source: "now-playing",
  });

  if (preferNowPlaying && nowPlayingId !== undefined) return convertNowPlaying(nowPlayingId);

  const url = (await Clipboard.readText())?.trim() || "";
  const outcome = url ? await resolveLink(url) : undefined;

  if (outcome?.ok) {
    const client = await getClient();
    const converted =
      outcome.direction === "from-qobuz"
        ? await convertFromQobuz(client, outcome.qobuzTrackId)
        : await convertToQobuz(client, outcome.track);
    return { ...converted, source: "clipboard", nowPlayingId };
  }

  const reason: ResolveFailure = outcome?.reason ?? "invalid";
  if (nowPlayingId !== undefined && YIELDS_TO_NOW_PLAYING.has(reason)) return convertNowPlaying(nowPlayingId);
  return outcome ? { mode: "error", reason } : { mode: "empty" };
};

export default function Command() {
  const [preferNowPlaying, setPreferNowPlaying] = useState(false);
  const { data, isLoading } = usePromise(convert, [preferNowPlaying], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't convert link" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading)}
      metadata={renderMetadata(data)}
      actions={renderActions(data, () => setPreferNowPlaying(true))}
    />
  );
}

const renderMetadata = (data: Conversion | undefined) => {
  if (!data) return undefined;
  if (data.mode === "to-qobuz" && data.track) return <ToQobuzMetadata data={data} track={data.track} />;
  if (data.mode === "from-qobuz") return <FromQobuzMetadata data={data} track={data.track} />;
  return undefined;
};

const renderActions = (data: Conversion | undefined, onUseNowPlaying: () => void) => {
  if (!data) return undefined;

  const useNowPlaying = (data.mode === "to-qobuz" || data.mode === "from-qobuz") &&
    data.source === "clipboard" &&
    data.nowPlayingId !== undefined && (
      <Action title="Use Now Playing Instead" icon={Icon.Music} onAction={onUseNowPlaying} />
    );

  if (data.mode === "to-qobuz" && data.track) {
    const trackUrl = deepLink.track(data.track.id);
    return (
      <ActionPanel>
        {data.track.album?.id && (
          <Action.Open title="Open in Qobuz" target={appLink.album(data.track.album.id)} icon={Icon.Music} />
        )}
        <Action.OpenInBrowser title="Open in Browser" url={trackUrl} />
        <Action.Open title="Play Track in Qobuz" target={appLink.track(data.track.id)} icon={Icon.Play} />
        <Action.CopyToClipboard title="Copy Qobuz Link" content={trackUrl} />
        {useNowPlaying}
      </ActionPanel>
    );
  }

  if (data.mode === "to-qobuz" && data.resolved) {
    const q = `${data.resolved.artist} ${data.resolved.title}`;
    return (
      <ActionPanel>
        <Action.OpenInBrowser
          title="Search on Qobuz"
          icon={Icon.MagnifyingGlass}
          url={`https://open.qobuz.com/search/${encodeURIComponent(q)}`}
        />
        {useNowPlaying}
      </ActionPanel>
    );
  }

  if (data.mode === "from-qobuz") {
    return (
      <ActionPanel>
        <Action.OpenInBrowser
          title="Search on YouTube Music"
          icon={Icon.MagnifyingGlass}
          url={ytMusicSearchUrl(data.query)}
        />
        <Action.OpenInBrowser
          title="Search on Spotify"
          icon={Icon.MagnifyingGlass}
          url={spotifySearchUrl(data.query)}
        />
        {data.deezerUrl && <Action.OpenInBrowser title="Open on Deezer" url={data.deezerUrl} />}
        <Action.CopyToClipboard title="Copy Artist & Title" content={data.query} />
        {useNowPlaying}
      </ActionPanel>
    );
  }

  return undefined;
};

const SOURCE_LABEL: Record<Source, string> = { clipboard: "Clipboard", "now-playing": "Now Playing in Qobuz" };

function ToQobuzMetadata({ data, track }: { data: ToQobuz; track: Track }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Source" text={SOURCE_LABEL[data.source]} />
      <Detail.Metadata.Label title="From" text={`${data.resolved.artist} — ${data.resolved.title}`} />
      <Detail.Metadata.TagList title="Match">
        <Detail.Metadata.TagList.Item
          text={data.exact ? "Exact (ISRC)" : "Approximate"}
          color={data.exact ? Color.Green : Color.Orange}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <TrackFacts track={track} />
    </Detail.Metadata>
  );
}

function FromQobuzMetadata({ data, track }: { data: FromQobuz; track: Track }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Source" text={SOURCE_LABEL[data.source]} />
      <Detail.Metadata.Separator />
      <TrackFacts track={track} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Deezer">
        <Detail.Metadata.TagList.Item
          text={data.deezerUrl ? "Exact (ISRC)" : "Not found"}
          color={data.deezerUrl ? Color.Green : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function TrackFacts({ track }: { track: Track }) {
  return (
    <>
      <Detail.Metadata.Label title="Title" text={track.title} />
      <Detail.Metadata.Label title="Artist" text={track.artist?.name ?? "—"} />
      {track.album?.title && <Detail.Metadata.Label title="Album" text={track.album.title} />}
      <Detail.Metadata.Label title="Duration" text={formatDuration(track.duration) || "—"} />
      <Detail.Metadata.TagList title="Quality">
        <Detail.Metadata.TagList.Item text={track.hires ? "Hi-Res" : "CD"} color={BRAND} />
      </Detail.Metadata.TagList>
      {track.isrc && <Detail.Metadata.Label title="ISRC" text={track.isrc} />}
    </>
  );
}

const coverMarkdown = (track: Track, album: Album | null): string => {
  const cover = album?.image?.large ?? track.album?.image?.small ?? album?.image?.small;
  return [
    cover ? `<img src="${cover}" width="220" height="220" />` : "",
    `# ${track.title}`,
    `### ${track.artist?.name ?? ""}`,
  ].join("\n\n");
};

const buildMarkdown = (data: Conversion | undefined, isLoading: boolean): string => {
  if (isLoading || !data) return "";
  if (data.mode === "empty") return UNRESOLVED_MESSAGE.invalid;

  if (data.mode === "error") return UNRESOLVED_MESSAGE[data.reason];

  if (data.mode === "from-qobuz") return coverMarkdown(data.track, data.album);

  if (!data.track)
    return [
      "# No Qobuz match",
      "",
      `Couldn't find **${data.resolved.artist} — ${data.resolved.title}** on Qobuz. Try "Search on Qobuz" below.`,
    ].join("\n");

  return coverMarkdown(data.track, data.album);
};
