import { Action, ActionPanel, Detail, LaunchType, launchCommand, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type AlbumBioResponse = {
  response?: {
    album?: {
      name?: string;
      url?: string;
      cover_art_url?: string;
      cover_art_thumbnail_url?: string;
      release_date_components?: {
        year?: number;
      };
      release_date_for_display?: string;
      release_date?: string;
      artist?: {
        name?: string;
      };
      description?: {
        plain?: string;
      };
      description_preview?: string;
    };
  };
};

type AlbumTracksResponse = {
  response?: {
    tracks?: Array<{
      number?: number;
      song?: {
        id?: number;
        title?: string;
      };
    }>;
  };
};

function buildAlbumBioMarkdown(data: AlbumBioResponse | undefined, fallbackTitle?: string): string {
  const album = data?.response?.album;
  const title = album?.name || fallbackTitle || "Album";
  const artist = album?.artist?.name || "";
  const description = album?.description?.plain?.trim() || album?.description_preview?.trim() || "";

  if (!description) {
    return [`# ${title}`, artist ? `### ${artist}` : "", "", "No Genius.com info is available for this album."]
      .filter(Boolean)
      .join("\n");
  }

  return [`# ${title}`, artist ? `### ${artist}` : "", "", description].filter(Boolean).join("\n");
}

export default function AlbumBioView({
  albumId,
  title,
  preferredManualQuery,
  openedFromManualSearch,
}: {
  albumId?: number;
  title?: string;
  preferredManualQuery?: string;
  openedFromManualSearch?: boolean;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = useFetch<AlbumBioResponse>(
    albumId ? `https://genius.com/api/albums/${albumId}` : "https://genius.com/api/albums/1",
    {
      execute: !!albumId,
    },
  );
  const { data: tracksData, isLoading: isTracksLoading } = useFetch<AlbumTracksResponse>(
    albumId ? `https://genius.com/api/albums/${albumId}/tracks` : "https://genius.com/api/albums/1/tracks",
    {
      execute: !!albumId,
    },
  );

  if (!albumId) {
    return <Detail markdown="Album info is unavailable because this track does not include a Genius album ID." />;
  }

  if (isLoading && !data) {
    return (
      <Detail
        isLoading
        navigationTitle="Album Info"
        markdown={title ? `Loading info for **${title}**...` : "Loading album info..."}
      />
    );
  }

  const album = data?.response?.album;
  const albumTitle = album?.name || title || "Unknown";
  const artist = album?.artist?.name || "";
  const releaseDate = album?.release_date_for_display || album?.release_date || "";
  const albumUrl = album?.url || "";
  const manualSearchQuery = preferredManualQuery?.trim() || [albumTitle, artist].filter(Boolean).join(" ").trim();
  const tracks = tracksData?.response?.tracks || [];
  const isLoadingCombined = isLoading || isTracksLoading;

  return (
    <Detail
      isLoading={isLoadingCombined}
      navigationTitle="Album Info"
      markdown={buildAlbumBioMarkdown(data, title)}
      actions={
        <ActionPanel>
          {albumUrl && <Action.OpenInBrowser title="Open Album on Genius.com" url={albumUrl} />}
          {openedFromManualSearch ? (
            <Action
              title="Back to Manual Search"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await pop();
              }}
            />
          ) : (
            <Action
              title="Search Album Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-album-bio-search",
                  type: LaunchType.UserInitiated,
                  arguments: {
                    query: manualSearchQuery,
                  },
                });
              }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Album" text={albumTitle} />
          {(artist || releaseDate || albumUrl) && <Detail.Metadata.Separator />}
          {artist && (
            <>
              <Detail.Metadata.Label title="Artist" text={artist} />
              {(releaseDate || albumUrl) && <Detail.Metadata.Separator />}
            </>
          )}
          {releaseDate && (
            <>
              <Detail.Metadata.Label title="Release Date" text={releaseDate} />
              {albumUrl && tracks.length === 0 && <Detail.Metadata.Separator />}
            </>
          )}
          {tracks.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {tracks.map((track, index) => {
                const trackNumber = track.number ?? index + 1;
                const trackTitle = track.song?.title || `Track ${trackNumber}`;
                const key = track.song?.id ? String(track.song.id) : `${trackNumber}-${trackTitle}`;
                return (
                  <Detail.Metadata.Label
                    key={key}
                    title={index === 0 ? "Tracklist" : "\u200B"}
                    text={`${trackNumber}. ${trackTitle}`}
                  />
                );
              })}
            </>
          )}
          {albumUrl && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="Genius" target={albumUrl} text="Open Album Page" />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
