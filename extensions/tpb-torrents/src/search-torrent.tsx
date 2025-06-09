import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { TorrentDetailView } from "./components";
import { useTorrentSearch } from "./hooks";
import { formatFileSize, formatDate, getCategoryIcon, generateMagnetLink } from "./utils";

export default function SearchTorrentCommand() {
  const [searchText, setSearchText] = useState("");
  const { torrents, isLoading, searchTorrents } = useTorrentSearch();

  const handleSearch = useCallback(
    (query: string) => {
      searchTorrents(query);
    },
    [searchTorrents],
  );

  const handleCopyMagnet = useCallback((infoHash: string, name: string) => {
    return generateMagnetLink(infoHash, name);
  }, []);

  // Memoize empty state to prevent unnecessary re-renders
  const emptyState = useMemo(
    () => (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No torrents found"
        description="Try searching with different keywords"
      />
    ),
    [],
  );

  // Memoize torrent items for better performance with large lists
  const torrentItems = useMemo(
    () =>
      torrents.map((torrent) => (
        <List.Item
          key={torrent.id}
          icon={getCategoryIcon(torrent.category)}
          title={torrent.name}
          subtitle={`${formatFileSize(parseInt(torrent.size))}`}
          accessories={[
            { text: torrent.username },
            { text: `${torrent.seeders}`, icon: Icon.ArrowDown },
            { text: `${torrent.leechers}`, icon: Icon.ArrowUp },
            { text: formatDate(torrent.added) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<TorrentDetailView torrent={torrent} />} icon={Icon.Eye} />
              <Action.CopyToClipboard
                title="Copy Magnet Link"
                content={handleCopyMagnet(torrent.info_hash, torrent.name)}
                icon={Icon.Link}
                onCopy={() => showToast(Toast.Style.Success, "Magnet link copied!")}
              />
              <Action.CopyToClipboard
                title="Copy Info Hash"
                content={torrent.info_hash}
                icon={Icon.Hashtag}
                onCopy={() => showToast(Toast.Style.Success, "Info hash copied!")}
              />
            </ActionPanel>
          }
        />
      )),
    [torrents, handleCopyMagnet],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchText);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, handleSearch]);

  const shouldShowEmptyState = torrents.length === 0 && searchText.trim() !== "" && !isLoading;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for torrents..."
      throttle
    >
      {shouldShowEmptyState ? emptyState : torrentItems}
    </List>
  );
}
