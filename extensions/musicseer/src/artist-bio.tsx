import { Action, ActionPanel, Detail, LaunchType, launchCommand, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type ArtistBioResponse = {
  response?: {
    artist?: {
      name?: string;
      url?: string;
      description?: {
        plain?: string;
      };
      description_preview?: string;
    };
  };
};

type ArtistAlbumsResponse = {
  response?: {
    albums?: Array<{
      id?: number;
      name?: string;
      release_date_components?: {
        year?: number;
        month?: number;
        day?: number;
      };
      release_date_for_display?: string;
    }>;
  };
};

function toReleaseSortValue(album: {
  release_date_components?: { year?: number; month?: number; day?: number };
  release_date_for_display?: string;
}): number {
  const yearFromParts = album.release_date_components?.year;
  const month = album.release_date_components?.month || 1;
  const day = album.release_date_components?.day || 1;
  if (yearFromParts) {
    return yearFromParts * 10000 + month * 100 + day;
  }
  const yearFromDisplay = album.release_date_for_display?.match(/\d{4}/)?.[0];
  return yearFromDisplay ? Number(yearFromDisplay) * 10000 + 101 : Number.MAX_SAFE_INTEGER;
}

function buildArtistBioMarkdown(data: ArtistBioResponse | undefined, fallbackName?: string): string {
  const artist = data?.response?.artist;
  const name = artist?.name || fallbackName || "Artist";
  const description = artist?.description?.plain?.trim() || artist?.description_preview?.trim() || "";

  if (!description) {
    return [`# ${name}`, "", "No Genius.com info is available for this artist."].filter(Boolean).join("\n");
  }

  return [`# ${name}`, "", description].filter(Boolean).join("\n");
}

export default function ArtistBioView({
  artistId,
  name,
  preferredManualQuery,
  openedFromManualSearch,
}: {
  artistId?: number;
  name?: string;
  preferredManualQuery?: string;
  openedFromManualSearch?: boolean;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = useFetch<ArtistBioResponse>(
    artistId ? `https://genius.com/api/artists/${artistId}` : "https://genius.com/api/artists/1",
    {
      execute: !!artistId,
    },
  );
  const { data: albumsData, isLoading: isAlbumsLoading } = useFetch<ArtistAlbumsResponse>(
    artistId ? `https://genius.com/api/artists/${artistId}/albums` : "https://genius.com/api/artists/1/albums",
    {
      execute: !!artistId,
    },
  );

  if (!artistId) {
    return <Detail markdown="Artist info is unavailable because this track does not include a Genius artist ID." />;
  }

  if (isLoading && !data) {
    return (
      <Detail
        isLoading
        navigationTitle="Artist Info"
        markdown={name ? `Loading info for **${name}**...` : "Loading artist info..."}
      />
    );
  }

  const artist = data?.response?.artist;
  const artistName = artist?.name || name || "Unknown Artist";
  const artistUrl = artist?.url || "";
  const manualSearchQuery = preferredManualQuery?.trim() || artistName;
  const albums = (albumsData?.response?.albums || [])
    .filter((album) => album.name)
    .slice()
    .sort((a, b) => toReleaseSortValue(a) - toReleaseSortValue(b));
  const isLoadingCombined = isLoading || isAlbumsLoading;

  return (
    <Detail
      isLoading={isLoadingCombined}
      navigationTitle="Artist Info"
      markdown={buildArtistBioMarkdown(data, name)}
      actions={
        <ActionPanel>
          {artistUrl && <Action.OpenInBrowser title="Open Artist on Genius.com" url={artistUrl} />}
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
              title="Search Artist Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-artist-bio-search",
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
          {albums.length > 0 && (
            <>
              {albums.map((album, index) => {
                const year =
                  album.release_date_components?.year || album.release_date_for_display?.match(/\d{4}/)?.[0] || "";
                const label = year ? `${year} - ${album.name}` : album.name || "Unknown Album";
                const key = album.id ? String(album.id) : `${index}-${label}`;
                return <Detail.Metadata.Label key={key} title={index === 0 ? "Albums" : "\u200B"} text={label} />;
              })}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
