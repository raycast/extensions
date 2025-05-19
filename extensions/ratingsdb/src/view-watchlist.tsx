import { useState, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import { MediaDetails } from "./types";
import { removeFromWatchlist, readWatchlist } from "./utils/watchlist";
import MediaListItem from "./components/MediaListItem";
import { searchID } from "./utils/requests";
import SearchBarAccessory from "./components/SearchBarAccessory";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<MediaDetails[]>([]);
  const [loadedItems, setLoadedItems] = useState<{ [key: string]: MediaDetails }>({});
  const [viewType, setViewType] = useState("all");

  useEffect(() => {
    const loadWatchlist = async () => {
      const items = await readWatchlist();
      setWatchlist(items as MediaDetails[]);
    };
    loadWatchlist();
  }, []);

  const handleRemove = async (imdbID: string) => {
    await removeFromWatchlist(imdbID);
    const updatedList = watchlist.filter((item) => item.imdbID !== imdbID);
    setWatchlist(updatedList);
  };

  const loadMediaDetails = async (imdbID: string) => {
    const media = await searchID(imdbID);
    setLoadedItems((prev) => ({ ...prev, [imdbID]: media as MediaDetails }));
  };

  if (watchlist.length === 0) {
    return (
      <List>
        <List.Item
          title="No items in watchlist"
          subtitle="Add items to your watchlist using the search command"
          icon={Icon.EyeSlash}
        />
      </List>
    );
  }

  // Filter watchlist based on viewType
  const filteredWatchlist = watchlist.filter((item) => {
    if (viewType === "all") return true;
    return item.Type === viewType;
  });

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="View your watchlist"
      throttle={true}
      searchBarAccessory={<SearchBarAccessory viewType={viewType} setViewType={setViewType} />}
    >
      {filteredWatchlist.length > 0 ? (
        <List.Section
          title={viewType === "all" ? "Watchlist" : `${viewType.charAt(0).toUpperCase() + viewType.slice(1)}s`}
        >
          {filteredWatchlist.map((item) => {
            if (!loadedItems[item.imdbID]) {
              loadMediaDetails(item.imdbID);
            }
            return <MediaListItem key={item.imdbID} title={loadedItems[item.imdbID] || item} onRemove={handleRemove} />;
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          title={viewType === "all" ? "No items in watchlist" : `No ${viewType}s in watchlist`}
          description={
            viewType === "all"
              ? "Add items to your watchlist using the search command"
              : `Add ${viewType}s to your watchlist using the search command`
          }
        />
      )}
    </List>
  );
}
