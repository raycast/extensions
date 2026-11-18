import { Action, ActionPanel, Clipboard, Color, Detail, Icon, type LaunchProps } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { resolveQobuzAlbum, type LinkAlbum } from "./lib/album";
import { AlbumActions, albumMarkdown, AlbumMetadata } from "./lib/album-view";
import { getClient, getTransport } from "./lib/client";
import { pickLink, sourceLabel, type PickedLink } from "./lib/link-source";
import { linkKind, looksLikeOpenableLink, type LinkKind } from "./lib/resolve";
import { noMatchTitle, openQobuzSearch, resolveTrackLink, type LinkTrack } from "./lib/resolve-copy";
import { coverMarkdown, TrackActions, TrackMetadata } from "./lib/track-view";

const EMPTY_MESSAGE = [
  "# No link to open",
  "",
  "Copy a Spotify, YouTube Music or Qobuz track or album link, or pass one.",
].join("\n");

const UNKNOWN_MESSAGE = [
  "# Unsupported link",
  "",
  "Open Shared Music takes Spotify, YouTube Music and Qobuz links.",
].join("\n");

const UNSUPPORTED_TITLE: Partial<Record<LinkKind, string>> = {
  playlist: "Can't open playlists",
  artist: "Can't open artist pages",
  podcast: "Can't open podcasts",
};

type Opened =
  | { kind: "track"; result: Extract<LinkTrack, { ok: true }> }
  | { kind: "album"; result: Extract<LinkAlbum, { ok: true }> }
  | { kind: "no-match"; artist: string; title: string }
  | { kind: "unsupported"; linkKind: LinkKind | undefined }
  | { kind: "unknown" };

type Conversion = { picked: PickedLink; opened: Opened } | null;

const open = async (url: string): Promise<Opened> => {
  if (!linkKind(url)) return { kind: "unknown" };
  if (!looksLikeOpenableLink(url)) return { kind: "unsupported", linkKind: linkKind(url) };
  if (linkKind(url) === "album") {
    const result = await resolveQobuzAlbum(await getTransport(), url);
    return result.ok ? { kind: "album", result } : failed(result);
  }
  const result = await resolveTrackLink(await getClient(), url);
  return result.ok ? { kind: "track", result } : failed(result);
};

// A link of the right shape whose page gave nothing to match on reads as an
// unsupported link.
const failed = (result: Extract<LinkTrack | LinkAlbum, { ok: false }>): Opened =>
  result.reason === "no-match" ? { kind: "no-match", artist: result.artist, title: result.title } : { kind: "unknown" };

// Show Current Track covers what Qobuz is playing, so with no link there is
// nothing to fall back to here.
const convert = async (argument: string): Promise<Conversion> => {
  const picked = pickLink(argument, await Clipboard.readText());
  if (!picked) return null;
  return { picked, opened: await open(picked.url) };
};

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenSharedMusic }>) {
  const argument = props.arguments.link?.trim() ?? "";
  const { data, isLoading } = usePromise(convert, [argument], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't open shared link" });
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

const sourceHeader = (picked: PickedLink, approximate: boolean, exactText: string) => (
  <>
    <Detail.Metadata.Label title="Source" text={sourceLabel(picked)} />
    {picked.service !== "qobuz" && (
      <Detail.Metadata.TagList title="Qobuz Match">
        <Detail.Metadata.TagList.Item
          text={approximate ? "Approximate" : exactText}
          color={approximate ? Color.Orange : Color.Green}
        />
      </Detail.Metadata.TagList>
    )}
    <Detail.Metadata.Separator />
  </>
);

const renderMetadata = (data: Conversion | undefined) => {
  if (!data) return undefined;
  const { picked, opened } = data;

  if (opened.kind === "track") {
    const { result } = opened;
    return (
      <TrackMetadata
        track={result.track}
        links={result.links}
        header={sourceHeader(picked, result.approximate, "Exact (ISRC)")}
      />
    );
  }
  if (opened.kind === "album") {
    const { result } = opened;
    return <AlbumMetadata album={result.album} header={sourceHeader(picked, result.approximate, "Exact (UPC)")} />;
  }
  return undefined;
};

const renderActions = (data: Conversion | undefined) => {
  if (!data) return undefined;
  const { picked, opened } = data;

  switch (opened.kind) {
    case "track":
      return (
        <TrackActions
          track={opened.result.track}
          links={opened.result.links}
          primary={picked.service === "qobuz" ? "share" : "open-in-qobuz"}
        />
      );
    case "album":
      return <AlbumActions album={opened.result.album} />;
    case "no-match":
      return (
        <ActionPanel>
          <Action
            title="Search on Qobuz"
            icon={Icon.MagnifyingGlass}
            onAction={() => openQobuzSearch(opened.artist, opened.title)}
          />
        </ActionPanel>
      );
    default:
      return undefined;
  }
};

const buildMarkdown = (data: Conversion | undefined, isLoading: boolean): string => {
  if (isLoading || data === undefined) return "";
  if (!data) return EMPTY_MESSAGE;

  const { picked, opened } = data;
  switch (opened.kind) {
    case "track":
      return coverMarkdown(opened.result.track, opened.result.album);
    case "album":
      return albumMarkdown(opened.result.album);
    case "no-match":
      return [
        `# ${noMatchTitle(opened.artist, opened.title)}`,
        "",
        `${sourceLabel(picked)}. Try Search on Qobuz.`,
      ].join("\n");
    case "unsupported":
      return [
        `# ${(opened.linkKind && UNSUPPORTED_TITLE[opened.linkKind]) ?? "Can't open this kind of link"}`,
        "",
        `${sourceLabel(picked)}: \`${picked.url}\``,
        "",
        "Opens shared tracks and albums from Spotify, YouTube Music and Qobuz.",
      ].join("\n");
    case "unknown":
      return UNKNOWN_MESSAGE;
  }
};
