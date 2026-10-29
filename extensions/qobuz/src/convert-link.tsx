import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { readNowPlayingTrackId, type Album, type Track } from "@kud/qobuz";
import { appLink, BRAND, deepLink, formatDuration, getClient } from "./lib/client";
import { convertFromQobuz, type FromQobuzResult } from "./lib/convert";
import { shareClipboard, shareQuery, ytMusicSearchUrl, type ShareLink } from "./lib/share";

const EMPTY_MESSAGE = [
  "# Nothing playing in Qobuz",
  "",
  "Start a track in the Qobuz app, or pass a link to Copy Share Links.",
].join("\n");

const load = async (): Promise<FromQobuzResult | null> => {
  const nowPlayingId = await readNowPlayingTrackId();
  if (nowPlayingId === undefined) return null;
  return convertFromQobuz(await getClient(), nowPlayingId);
};

export default function Command() {
  const { data, isLoading } = usePromise(load, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't load current track" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading)}
      metadata={renderMetadata(data)}
      actions={renderActions(data)}
    />
  );
}

const renderMetadata = (data: FromQobuzResult | null | undefined) => {
  if (!data) return undefined;
  return (
    <Detail.Metadata>
      <TrackFacts track={data.track} />
      <Detail.Metadata.Separator />
      {data.links
        .filter((link) => link.platform !== "qobuz" && link.platform !== "songlink")
        .map((link) => (
          <Detail.Metadata.TagList key={link.platform} title={LINK_LABEL[link.platform]}>
            <Detail.Metadata.TagList.Item
              text={MATCH_TAG[link.confidence].text}
              color={MATCH_TAG[link.confidence].color}
            />
          </Detail.Metadata.TagList>
        ))}
    </Detail.Metadata>
  );
};

const renderActions = (data: FromQobuzResult | null | undefined) => {
  if (!data) return undefined;

  const trackUrl = deepLink.track(data.track.id);
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Share Links"
        icon={Icon.Link}
        content={shareClipboard(data.track, data.links)}
      />
      <Action.CopyToClipboard
        title="Copy Qobuz Link"
        content={trackUrl}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
      <Action.CopyToClipboard title="Copy Artist & Title" content={shareQuery(data.track)} />
      <ActionPanel.Section title="Other Services">
        <Action.OpenInBrowser
          title="Search on YouTube Music"
          icon={Icon.MagnifyingGlass}
          url={ytMusicSearchUrl(shareQuery(data.track))}
        />
        {data.links
          .filter((link) => link.platform !== "qobuz" && link.platform !== "songlink")
          .map((link) => (
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
        <Action.Open title="Open in Qobuz" target={appLink.track(data.track.id)} icon={Icon.Music} />
        <Action.OpenInBrowser title="Open in Browser" url={trackUrl} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

const LINK_LABEL: Record<ShareLink["platform"], string> = {
  qobuz: "Qobuz",
  deezer: "Deezer",
  apple: "Apple Music",
  spotify: "Spotify",
  tidal: "Tidal",
  songlink: "song.link",
};

const MATCH_TAG: Record<ShareLink["confidence"], { text: string; color: Color }> = {
  exact: { text: "Exact (ISRC)", color: Color.Green },
  approximate: { text: "Approximate", color: Color.Orange },
  search: { text: "Search", color: Color.SecondaryText },
};

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

const buildMarkdown = (data: FromQobuzResult | null | undefined, isLoading: boolean): string => {
  if (isLoading || data === undefined) return "";
  if (!data) return EMPTY_MESSAGE;
  return coverMarkdown(data.track, data.album);
};
