import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import type { Album, Track } from "@kud/qobuz";
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

type Conversion =
  | { mode: "empty" }
  | { mode: "error"; reason: ResolveFailure }
  | {
      mode: "to-qobuz";
      resolved: ResolvedTrack;
      track: Track | null;
      album: Album | null;
      exact: boolean;
    }
  | {
      mode: "from-qobuz";
      track: Track;
      album: Album | null;
      query: string;
      deezerUrl?: string;
    };

const SUPPORTED_HINT = "Copy a **Spotify**, **YouTube Music**, or **Qobuz** track link, then run this command.";

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

export default function Command() {
  const { data, isLoading } = usePromise(
    async (): Promise<Conversion> => {
      const url = (await Clipboard.readText())?.trim() || "";
      if (!url) return { mode: "empty" };

      const outcome = await resolveLink(url);
      if (!outcome.ok) return { mode: "error", reason: outcome.reason };

      const client = await getClient();

      // Reverse: a Qobuz track → links on the other services.
      if (outcome.direction === "from-qobuz") {
        const track = await client.tracks.get(outcome.qobuzTrackId);
        const album = track.album?.id
          ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null)
          : null;
        const query = `${track.artist?.name ?? ""} ${track.title}`.trim();
        const deezerUrl = track.isrc ? await deezerByIsrc(track.isrc) : undefined;
        return { mode: "from-qobuz", track, album, query, deezerUrl };
      }

      // Forward: a foreign track → the matching Qobuz track.
      const resolved = outcome.track;
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

      const album = track?.album?.id
        ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null)
        : null;

      return { mode: "to-qobuz", resolved, track, album, exact };
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Couldn't convert link" });
      },
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading)}
      metadata={renderMetadata(data)}
      actions={renderActions(data)}
    />
  );
}

const renderMetadata = (data: Conversion | undefined) => {
  if (!data) return undefined;
  if (data.mode === "to-qobuz" && data.track) return <ToQobuzMetadata data={data} track={data.track} />;
  if (data.mode === "from-qobuz") return <FromQobuzMetadata data={data} track={data.track} />;
  return undefined;
};

const renderActions = (data: Conversion | undefined) => {
  if (!data) return undefined;

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
      </ActionPanel>
    );
  }

  return undefined;
};

function ToQobuzMetadata({ data, track }: { data: Extract<Conversion, { mode: "to-qobuz" }>; track: Track }) {
  return (
    <Detail.Metadata>
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

function FromQobuzMetadata({ data, track }: { data: Extract<Conversion, { mode: "from-qobuz" }>; track: Track }) {
  return (
    <Detail.Metadata>
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
  if (isLoading || !data || data.mode === "empty") return "";

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
