import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { load } from "cheerio";
import { useMemo } from "react";

type SongResponse = {
  response: {
    song: {
      primary_artist: {
        name: string;
      };
      album?: {
        name: string;
      };
      release_date?: string;
      release_date_for_display?: string;
      producer_artists?: Array<{
        name: string;
      }>;
      writer_artists?: Array<{
        name: string;
      }>;
    };
  };
};

export default function Lyrics({ url, title, songId }: { url: string; title: string; songId?: number }) {
  const { data: htmlData, isLoading: isHtmlLoading } = useFetch<string>(url, {
    keepPreviousData: true,
  });

  // Fetch song metadata from API - only when there is a song ID
  const { data: songData, isLoading: isSongLoading } = useFetch<SongResponse>(
    songId ? `https://genius.com/api/songs/${songId}` : "https://genius.com/api/songs/1",
    {
      execute: !!songId,
    },
  );

  // Extract lyrics from HTML
  const text = useMemo(() => {
    if (!htmlData) return "";

    const $ = load(htmlData);
    $("br").text("\n\n");
    let text = $("[data-lyrics-container=true]").find("[data-exclude-from-selection=true]").remove().end().text();
    text = text.replaceAll("[", "### [");
    return text;
  }, [htmlData]);

  // Extract metadata from API response
  const song = songData?.response?.song;
  const artist = song?.primary_artist?.name || "";
  const album = song?.album?.name || "";
  const releaseDate = song?.release_date_for_display || song?.release_date || "";
  const producersArr = song?.producer_artists?.map((p: { name: string }) => p.name) || [];
  const writersArr = song?.writer_artists?.map((w: { name: string }) => w.name) || [];

  const isLoadingCombined = isHtmlLoading || isSongLoading;

  return (
    <Detail
      isLoading={isLoadingCombined}
      markdown={text}
      navigationTitle={title}
      metadata={
        <Detail.Metadata>
          {artist && (
            <>
              <Detail.Metadata.Label title="Artist" text={artist} />
              {album && <Detail.Metadata.Separator />}
            </>
          )}
          {releaseDate && (
            <>
              <Detail.Metadata.Label title="Release Date" text={releaseDate} />
              {(album || producersArr.length > 0 || writersArr.length > 0) && <Detail.Metadata.Separator />}
            </>
          )}
          {album && (
            <>
              <Detail.Metadata.Label title="Album" text={album} />
              {(producersArr.length > 0 || writersArr.length > 0) && <Detail.Metadata.Separator />}
            </>
          )}
          {producersArr.length > 0 && (
            <Detail.Metadata.TagList title="Producers">
              {producersArr.map((p) => (
                <Detail.Metadata.TagList.Item key={p} text={p} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {writersArr.length > 0 && (
            <Detail.Metadata.TagList title="Writers">
              {writersArr.map((w) => (
                <Detail.Metadata.TagList.Item key={w} text={w} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
        </ActionPanel>
      }
    />
  );
}
