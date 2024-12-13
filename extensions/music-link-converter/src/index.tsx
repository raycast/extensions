import { Action, ActionPanel, Clipboard, LaunchProps, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import fetch from "node-fetch";

interface PlatformLinkApiResponse {
  url: string;
  nativeAppUriDesktop: string | null;
}

interface PlatformLinksApiResponse {
  amazonMusic: PlatformLinkApiResponse | null;
  amazonStore: PlatformLinkApiResponse | null;
  anghami: PlatformLinkApiResponse | null;
  deezer: PlatformLinkApiResponse | null;
  appleMusic: PlatformLinkApiResponse | null;
  itunes: PlatformLinkApiResponse | null;
  soundcloud: PlatformLinkApiResponse | null;
  tidal: PlatformLinkApiResponse | null;
  yandex: PlatformLinkApiResponse | null;
  youtube: PlatformLinkApiResponse | null;
  youtubeMusic: PlatformLinkApiResponse | null;
  spotify: PlatformLinkApiResponse | null;
}

interface SongLinkApiResponse {
  linksByPlatform?: PlatformLinksApiResponse;
}

interface SongLink {
  label: string;
  link: PlatformLinkApiResponse;
}

function matchesSongUrlLink(potentialSongUrl: string | undefined): boolean {
  if (potentialSongUrl === undefined) {
    return false;
  }
  return (
    potentialSongUrl.startsWith("spotify:") ||
    potentialSongUrl.startsWith("https://open.spotify.com/") ||
    potentialSongUrl.startsWith("https://music.apple.com/") ||
    potentialSongUrl.startsWith("https://geo.music.apple.com/") ||
    potentialSongUrl.startsWith("https://music.youtube.com/") ||
    potentialSongUrl.startsWith("https://music.amazon.com/") ||
    potentialSongUrl.startsWith("https://www.youtube.com/") ||
    potentialSongUrl.startsWith("https://www.deezer.com/") ||
    potentialSongUrl.startsWith("https://www.soundcloud.com/") ||
    potentialSongUrl.startsWith("https://listen.tidal.com/") ||
    potentialSongUrl.startsWith("https://tidal.com/") ||
    potentialSongUrl.startsWith("https://play.anghami.com/")
  );
}

function apiResponseToSongLinksList(songLinks: SongLinkApiResponse): SongLink[] {
  const array = Array<SongLink>();
  const links = songLinks.linksByPlatform;
  if (songLinks.linksByPlatform == null) {
    return array;
  }
  if (links?.appleMusic != null) {
    array.push({ label: "Apple Music", link: links.appleMusic });
  }
  if (links?.spotify != null) {
    array.push({ label: "Spotify", link: links.spotify });
  }
  if (links?.amazonMusic != null) {
    array.push({ label: "Amazon Music", link: links.amazonMusic });
  }
  if (links?.youtubeMusic != null) {
    array.push({ label: "Youtube Music", link: links.youtubeMusic });
  }
  if (links?.youtube != null) {
    array.push({ label: "Youtube", link: links.youtube });
  }
  if (links?.deezer != null) {
    array.push({ label: "Deezer", link: links.deezer });
  }
  if (links?.itunes != null) {
    array.push({ label: "Itunes", link: links.itunes });
  }
  if (links?.soundcloud != null) {
    array.push({ label: "Soundcloud", link: links.soundcloud });
  }
  if (links?.anghami != null) {
    array.push({ label: "Anghami", link: links.anghami });
  }
  if (links?.tidal != null) {
    array.push({ label: "Tidal", link: links.tidal });
  }
  if (links?.yandex != null) {
    array.push({ label: "Yandex", link: links.yandex });
  }
  return array;
}

export default function MusicLinkConverter(props: LaunchProps<{ arguments: { text: string | undefined } }>) {
  const [songLinks, setSongLinks] = useState<SongLink[]>();
  const [songUrlToConvert, setSongUrlToConvert] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findSongUrlToConvert() {
      setLoading(true);
      const clipboardText = (await Clipboard.read()).text;
      const hasArgumentMatchingSongLink = props.arguments.text != undefined && matchesSongUrlLink(props.arguments.text);
      if (matchesSongUrlLink(clipboardText) && !hasArgumentMatchingSongLink) {
        setSongUrlToConvert(clipboardText);
      } else if (hasArgumentMatchingSongLink) {
        setSongUrlToConvert(props.arguments.text as string);
      } else if (!hasArgumentMatchingSongLink) {
        await showToast(Toast.Style.Failure, "No valid music URL found to convert.");
      } else {
        setLoading(false);
        await showToast(Toast.Style.Failure, "No music url found in clipboard or as argument.");
      }
    }
    findSongUrlToConvert().then();
  }, []);

  useEffect(() => {
    async function fetchSongLinkResponse() {
      setLoading(true);
      if (songUrlToConvert == undefined || songUrlToConvert.length == 0) {
        return;
      }
      const songLinksResponse = await fetch(`https://api.song.link/v1-alpha.1/links?url=${songUrlToConvert}`);
      if (!songLinksResponse.ok) {
        setLoading(false);
        await showToast(Toast.Style.Failure, `Error: ${songLinksResponse.status} ${await songLinksResponse.text()}`);
        return;
      }

      setSongLinks(apiResponseToSongLinksList((await songLinksResponse.json()) as SongLinkApiResponse));
      setLoading(false);
      await showToast(Toast.Style.Success, `Converted ${songUrlToConvert}`);
    }
    fetchSongLinkResponse().then();
  }, [songUrlToConvert]);

  return (
    <List isLoading={loading}>
      {songLinks?.map((item: SongLink) => (
        <List.Item
          key={item.label}
          title={item.label}
          actions={
            <ActionPanel>
              {item.link.nativeAppUriDesktop != null && (
                  <Action.CopyToClipboard title={"Copy Desktop URI"} content={`${item.link.nativeAppUriDesktop}`} />
                ) && (
                  <Action.OpenInBrowser
                    title={"Open Desktop"}
                    url={`${item.link.nativeAppUriDesktop}`}
                    onOpen={(url: string) => Clipboard.copy(url)}
                  />
                )}
              <Action.CopyToClipboard title={"Copy URL"} content={`${item.link.url}`} />
              <Action.OpenInBrowser
                title={"Open URL"}
                url={`${item.link.url}`}
                onOpen={(url: string) => Clipboard.copy(url)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
