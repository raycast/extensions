import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import type { Album, Track } from "@kud/qobuz";
import type { ReactNode } from "react";
import { appLink, BRAND, deepLink, formatDuration } from "./client";
import { shareClipboard, shareQuery, ytMusicSearchUrl, type ShareLink } from "./share";

export const LINK_LABEL: Record<ShareLink["platform"], string> = {
  qobuz: "Qobuz",
  deezer: "Deezer",
  apple: "Apple Music",
  spotify: "Spotify",
  tidal: "Tidal",
  songlink: "song.link",
};

export const MATCH_TAG: Record<ShareLink["confidence"], { text: string; color: Color }> = {
  exact: { text: "Exact (ISRC)", color: Color.Green },
  approximate: { text: "Approximate", color: Color.Orange },
  search: { text: "Search", color: Color.SecondaryText },
};

const otherServices = (links: ShareLink[]) =>
  links.filter((link) => link.platform !== "qobuz" && link.platform !== "songlink");

// `header` sits above the track facts, for what a caller knows about where the
// track came from.
export function TrackMetadata({ track, links, header }: { track: Track; links: ShareLink[]; header?: ReactNode }) {
  return (
    <Detail.Metadata>
      {header}
      <TrackFacts track={track} />
      <Detail.Metadata.Separator />
      {otherServices(links).map((link) => (
        <Detail.Metadata.TagList key={link.platform} title={LINK_LABEL[link.platform]}>
          <Detail.Metadata.TagList.Item
            text={MATCH_TAG[link.confidence].text}
            color={MATCH_TAG[link.confidence].color}
          />
        </Detail.Metadata.TagList>
      ))}
    </Detail.Metadata>
  );
}

// "share" leads with the share message, for a track already on Qobuz;
// "open-in-qobuz" leads with opening it, for a track brought over from another
// service.
export function TrackActions({
  track,
  links,
  primary,
}: {
  track: Track;
  links: ShareLink[];
  primary: "share" | "open-in-qobuz";
}) {
  const trackUrl = deepLink.track(track.id);
  const openInQobuz = <Action.Open title="Open in Qobuz" target={appLink.track(track.id)} icon={Icon.Music} />;
  const copyShareLinks = (
    <Action.CopyToClipboard title="Copy Share Links" icon={Icon.Link} content={shareClipboard(track, links)} />
  );
  const copyQobuzLink = (
    <Action.CopyToClipboard
      title="Copy Qobuz Link"
      content={trackUrl}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
    />
  );

  return (
    <ActionPanel>
      {primary === "open-in-qobuz" ? openInQobuz : copyShareLinks}
      {copyQobuzLink}
      {primary === "open-in-qobuz" && copyShareLinks}
      <Action.CopyToClipboard title="Copy Artist & Title" content={shareQuery(track)} />
      <ActionPanel.Section title="Other Services">
        <Action.OpenInBrowser
          title="Search on YouTube Music"
          icon={Icon.MagnifyingGlass}
          url={ytMusicSearchUrl(shareQuery(track))}
        />
        {otherServices(links).map((link) => (
          <Action.OpenInBrowser
            key={link.platform}
            title={
              link.confidence === "search"
                ? `Search on ${LINK_LABEL[link.platform]}`
                : `Open on ${LINK_LABEL[link.platform]}`
            }
            icon={link.confidence === "search" ? Icon.MagnifyingGlass : Icon.Globe}
            url={link.url}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Qobuz">
        {primary === "share" && openInQobuz}
        <Action.OpenInBrowser title="Open in Browser" url={trackUrl} />
      </ActionPanel.Section>
    </ActionPanel>
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

export const coverMarkdown = (track: Track, album: Album | null): string => {
  const cover = album?.image?.large ?? track.album?.image?.small ?? album?.image?.small;
  return [
    cover ? `<img src="${cover}" width="220" height="220" />` : "",
    `# ${track.title}`,
    `### ${track.artist?.name ?? ""}`,
  ].join("\n\n");
};
