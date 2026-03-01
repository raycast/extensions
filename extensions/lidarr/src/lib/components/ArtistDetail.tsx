import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import AlbumReleaseSearchB from "@/lib/components/AlbumReleaseSearchB";
import { format } from "date-fns";
import { useMemo } from "react";
import { useArtistAlbums } from "@/lib/hooks/useLidarrAPI";
import type { Artist } from "@/lib/types/lidarr";
import { getLidarrUrl } from "@/lib/utils/formatting";

export default function ArtistDetail({ artist }: { artist: Artist }) {
  const { data: albums = [], isLoading: isAlbumsLoading, mutate } = useArtistAlbums(artist.id);
  const lidarrUrl = getLidarrUrl();

  const groupedAlbums = useMemo(() => {
    const groups = new Map<string, typeof albums>();

    for (const album of albums) {
      const type = (album.albumType || "other").toLowerCase();
      const existing = groups.get(type) || [];
      existing.push(album);
      groups.set(type, existing);
    }

    return Array.from(groups.entries())
      .map(([type, items]) => {
        const sortedItems = items.slice().sort((a, b) => {
          const aTime = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const bTime = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;

          if (aTime !== bTime) return bTime - aTime;
          return a.title.localeCompare(b.title);
        });

        return [type, sortedItems] as const;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [albums]);

  const formatTypeHeading = (type: string): string => {
    switch (type) {
      case "album":
        return "Albums";
      case "ep":
        return "EPs";
      case "single":
        return "Singles";
      default:
        return `${type.charAt(0).toUpperCase()}${type.slice(1)}s`;
    }
  };

  const getTrackCountTag = (trackFileCount?: number, trackCount?: number): { value: string; color: Color } => {
    const files = trackFileCount ?? 0;
    const total = trackCount ?? 0;

    if (total > 0 && files >= total) {
      return { value: `${files} / ${total}`, color: Color.Green };
    }

    return { value: `${files} / ${total}`, color: Color.Orange };
  };

  const formatReleaseDate = (releaseDate?: string): string => {
    if (!releaseDate) return "";
    try {
      return format(new Date(releaseDate), "MMM d yyyy");
    } catch {
      return releaseDate;
    }
  };

  return (
    <List isLoading={isAlbumsLoading} searchBarPlaceholder={`Search ${artist.artistName} albums...`}>
      <List.Section title="All Items" subtitle={`${albums.length}`}>
        {albums.length === 0 && (
          <List.Item title="No Albums" subtitle="No albums found for this artist" icon={Icon.Music} />
        )}
      </List.Section>

      {groupedAlbums.map(([type, typeAlbums]) => (
        <List.Section key={type} title={formatTypeHeading(type)} subtitle={`${typeAlbums.length}`}>
          {typeAlbums.map((album) => {
            const trackTag = getTrackCountTag(album.statistics?.trackFileCount, album.statistics?.trackCount);
            const albumUrl = `${lidarrUrl}/album/${album.foreignAlbumId || album.id}`;

            return (
              <List.Item
                key={album.id}
                title={album.title}
                accessories={[
                  ...(album.releaseDate ? [{ text: formatReleaseDate(album.releaseDate) }] : []),
                  { tag: trackTag },
                  {
                    tag: {
                      value: album.monitored ? "Monitored" : "Unmonitored",
                      color: album.monitored ? Color.Green : Color.SecondaryText,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Manual Search Releases"
                      icon={Icon.List}
                      target={<AlbumReleaseSearchB album={album} />}
                    />
                    <Action.OpenInBrowser title="Open in Lidarr" icon={Icon.Globe} url={albumUrl} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => mutate()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      <List.Section title="Actions">
        <List.Item
          title="Refresh Artist Data"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => mutate()} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
