import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import type { QobuzAlbum } from "./album";
import { appLink, deepLink, formatDuration } from "./client";
import { ytMusicSearchUrl } from "./share";
import { QualityTag } from "./track-view";

const artistName = (album: QobuzAlbum): string => album.artist?.name ?? "";

const artistAndAlbum = (album: QobuzAlbum): string => `${artistName(album)} ${album.title}`.trim();

const albumDuration = (seconds?: number): string => {
  if (!seconds || seconds < 3600) return formatDuration(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  return `${hours}:${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};

// "12 · 48:10", or just the count when Qobuz has no duration.
const albumLength = (album: QobuzAlbum): string => {
  const count = String(album.tracksCount ?? album.tracks.length);
  const duration = albumDuration(album.duration);
  return duration ? `${count} · ${duration}` : count;
};

// `header` sits above the album facts, as for tracks.
export function AlbumMetadata({ album, header }: { album: QobuzAlbum; header?: ReactNode }) {
  return (
    <Detail.Metadata>
      {header}
      <Detail.Metadata.Label title="Title" text={album.title} />
      <Detail.Metadata.Label title="Artist" text={artistName(album) || "—"} />
      {album.year && <Detail.Metadata.Label title="Released" text={String(album.year)} />}
      <Detail.Metadata.Label title="Tracks" text={albumLength(album)} />
      {album.label && <Detail.Metadata.Label title="Label" text={album.label} />}
      <QualityTag hires={album.hires} />
      {album.upc && <Detail.Metadata.Label title="UPC" text={album.upc} />}
    </Detail.Metadata>
  );
}

export function AlbumActions({ album }: { album: QobuzAlbum }) {
  const albumUrl = deepLink.album(album.id);

  return (
    <ActionPanel>
      <Action.Open title="Open in Qobuz" target={appLink.album(album.id)} icon={Icon.Music} />
      <Action.CopyToClipboard
        title="Copy Qobuz Link"
        content={albumUrl}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
      <Action.CopyToClipboard title="Copy Artist & Album" content={artistAndAlbum(album)} />
      <ActionPanel.Section title="Other Services">
        <Action.OpenInBrowser
          title="Search on YouTube Music"
          icon={Icon.MagnifyingGlass}
          url={ytMusicSearchUrl(artistAndAlbum(album))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Qobuz">
        <Action.OpenInBrowser title="Open in Browser" url={albumUrl} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const albumMarkdown = (album: QobuzAlbum): string => {
  const tracklist = album.tracks
    .map((track, index) => `${index + 1}. ${track.title}  ${formatDuration(track.duration)}`.trimEnd())
    .join("\n");
  return [
    album.cover ? `<img src="${album.cover}" width="220" height="220" />` : "",
    `# ${album.title}`,
    `### ${artistName(album)}`,
    tracklist,
  ].join("\n\n");
};
