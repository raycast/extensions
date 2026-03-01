import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import ArtistDetail from "@/lib/components/ArtistDetail";
import { getQualityProfiles, useArtists } from "@/lib/hooks/useLidarrAPI";
import type { Artist } from "@/lib/types/lidarr";
import { getLidarrUrl } from "@/lib/utils/formatting";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualityProfileMap, setQualityProfileMap] = useState<Record<number, string>>({});
  const { data: artists = [], isLoading, mutate } = useArtists();

  useEffect(() => {
    (async () => {
      const profiles = await getQualityProfiles();
      const map = profiles.reduce<Record<number, string>>((acc, profile) => {
        acc[profile.id] = profile.name;
        return acc;
      }, {});
      setQualityProfileMap(map);
    })();
  }, []);

  const filteredArtists = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return artists
      .filter((artist) => {
        if (statusFilter === "monitored" && !artist.monitored) return false;
        if (statusFilter === "unmonitored" && artist.monitored) return false;
        if (!query) return true;

        const fields = [artist.artistName, artist.sortName, ...(artist.genres || [])];
        return fields.some((field) => field.toLowerCase().includes(query));
      })
      .sort((a, b) => a.artistName.localeCompare(b.artistName));
  }, [artists, searchText, statusFilter]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Search artists..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Artist Filter" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="All Artists" value="all" />
          <List.Dropdown.Item title="Monitored" value="monitored" />
          <List.Dropdown.Item title="Unmonitored" value="unmonitored" />
        </List.Dropdown>
      }
    >
      {filteredArtists.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Artists Found"
          description={searchText ? "No artists matched your search" : "Your Lidarr library is empty"}
          icon={Icon.Music}
        />
      )}

      <List.Section title="Artists" subtitle={`${filteredArtists.length}`}>
        {filteredArtists.map((artist) => (
          <ArtistListItem
            key={artist.id}
            artist={artist}
            qualityProfileName={artist.qualityProfileId ? qualityProfileMap[artist.qualityProfileId] : undefined}
            onRefresh={mutate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ArtistListItem({
  artist,
  qualityProfileName,
  onRefresh,
}: {
  artist: Artist;
  qualityProfileName?: string;
  onRefresh: () => void;
}) {
  const stats = artist.statistics;
  const lidarrUrl = getLidarrUrl();
  const artistUrl = `${lidarrUrl}/artist/${artist.foreignArtistId || artist.id}`;

  return (
    <List.Item
      title={artist.artistName}
      subtitle={qualityProfileName || "Unknown Quality Profile"}
      accessories={[
        {
          tag: {
            value: `Albums: ${stats?.albumCount ?? 0}`,
            color: Color.Blue,
          },
        },
        {
          tag: {
            value: `Tracks: ${stats?.trackFileCount ?? 0}/${stats?.trackCount ?? 0}`,
            color: Color.Green,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Artist" icon={Icon.ChevronRight} target={<ArtistDetail artist={artist} />} />
          <Action.OpenInBrowser title="Open in Lidarr" icon={Icon.Globe} url={artistUrl} />
          <Action.CopyToClipboard title="Copy Artist Name" content={artist.artistName} />
          {artist.path && <Action.CopyToClipboard title="Copy Artist Path" content={artist.path} />}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
