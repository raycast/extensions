import {
  ActionPanel,
  Action,
  List,
  Image,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  getFavorites,
  VideoItem,
  formatDuration,
  formatNumber,
  ensureHttps,
  getVideoDetails,
  VideoStats,
  getFavoriteFolders,
  FavoriteFolder,
  getSelfMid,
  getAllFavorites,
} from "./utils/bilibili-api";
import { isLoggedIn } from "./utils/auth";

export default function Command() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [videoStats, setVideoStats] = useState<Record<string, VideoStats>>({});

  const loggedIn = useMemo(() => isLoggedIn(), []);

  const fetchPage = async (pn: number, query: string = "") => {
    setIsLoading(true);
    try {
      if (selectedFolderId === "all") {
        if (!query) {
          // If no query in "All" mode, maybe just show empty or dont load anything to save resources
          // Or load from all folders page 1? keeping it empty for now as per plan
          setItems([]);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        // Search in all folders
        const allItems: VideoItem[] = [];
        const results = await Promise.all(
          folders.map(async (folder) => {
            // Fetch all matches in this folder
            const folderItems = await getAllFavorites(folder.id, query);
            return folderItems.map((item) => ({
              ...item,
              typename: folder.title,
            }));
          }),
        );
        results.forEach((res) => allItems.push(...res));
        setItems(allItems);
        setHasMore(false); // Search result is all-in-one
      } else {
        // Single folder
        const fid = parseInt(selectedFolderId);
        if (!isNaN(fid)) {
          const data = await getFavorites(fid, pn, query);
          if (pn === 1) {
            setItems(data);
          } else {
            setItems((prev) => {
              const existing = new Set(prev.map((p) => p.bvid));
              return [...prev, ...data.filter((d) => !existing.has(d.bvid))];
            });
          }
          setHasMore(data.length >= 20);
        }
      }
    } catch (e) {
      console.error("Failed to fetch favorites", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) {
      setIsLoading(false);
      return;
    }

    async function loadFolders() {
      const mid = await getSelfMid();
      if (mid) {
        const fs = await getFavoriteFolders(mid);
        setFolders(fs);
        if (fs.length > 0) {
          const preferences = getPreferenceValues<{
            defaultFavoriteFolder?: string;
          }>();
          const defaultName = preferences.defaultFavoriteFolder?.trim();

          let targetFolder = fs[0];
          if (defaultName) {
            const found = fs.find(
              (f) => f.title.trim().toLowerCase() === defaultName.toLowerCase(),
            );
            if (found) {
              targetFolder = found;
            }
          }

          // Default to first folder, or we could default to "all"
          setSelectedFolderId(String(targetFolder.id));
          return;
        }
      }
      // Fallback if no folders found or mid failed
      setIsLoading(false);
    }

    loadFolders();
  }, [loggedIn]);

  useEffect(() => {
    if (!selectedFolderId) return;

    // Reset state on folder or search change
    setItems([]);
    setVideoStats({});
    setPage(1);
    setHasMore(true);
    fetchPage(1, searchText);
  }, [selectedFolderId, searchText]);

  useEffect(() => {
    const run = async () => {
      const missingBvids = items
        .filter((it) => !!it.bvid)
        .map((it) => it.bvid)
        .filter((bvid) => !videoStats[bvid]);

      if (missingBvids.length === 0) return;

      const chunkSize = 5;

      for (let i = 0; i < missingBvids.length; i += chunkSize) {
        const chunk = missingBvids.slice(i, i + chunkSize);

        const chunkResults = await Promise.all(
          chunk.map(async (bvid) => {
            const stats = await getVideoDetails(bvid);
            return { bvid, stats };
          }),
        );

        const patch: Record<string, VideoStats> = {};
        for (const r of chunkResults) {
          if (r.stats) patch[r.bvid] = r.stats;
        }

        if (Object.keys(patch).length > 0) {
          setVideoStats((prev) => ({ ...prev, ...patch }));
        }
      }
    };

    run();
  }, [items]);

  if (!loggedIn) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="Login Required"
          description="Please login to view your favorites."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url="https://www.bilibili.com"
                title="Open Bilibili"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search favorites..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        folders.length > 0 ? (
          <List.Dropdown
            tooltip="Select Favorite Folder"
            value={selectedFolderId}
            onChange={setSelectedFolderId}
          >
            <List.Dropdown.Item
              key="all"
              title="All Favorites"
              value="all"
              icon={Icon.Globe}
            />
            {folders.map((f) => (
              <List.Dropdown.Item
                key={f.id}
                title={`${f.title} (${f.media_count})`}
                value={String(f.id)}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      pagination={{
        onLoadMore: () => {
          const next = page + 1;
          setPage(next);
          fetchPage(next, searchText);
        },
        hasMore,
        pageSize: 20,
      }}
    >
      {selectedFolderId === "all" ? (
        items.length === 0 && !isLoading && !searchText ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Type to search all favorites"
            description="Search across all your favorite folders"
          />
        ) : (
          // Group by folder (using typename we hacked in)
          Array.from(new Set(items.map((i) => i.typename))).map(
            (folderName) => (
              <List.Section key={folderName} title={folderName}>
                {items
                  .filter((i) => i.typename === folderName)
                  .map((item, index) => (
                    <FavItem
                      key={`${item.bvid}-${index}`}
                      item={item}
                      stats={videoStats[item.bvid]}
                      isShowingDetail={isShowingDetail}
                      onToggleDetail={() => setIsShowingDetail((v) => !v)}
                    />
                  ))}
              </List.Section>
            ),
          )
        )
      ) : (
        // Flat list for single folder
        items.map((item, index) => (
          <FavItem
            key={`${item.bvid}-${index}`}
            item={item}
            stats={videoStats[item.bvid]}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((v) => !v)}
          />
        ))
      )}

      {/* Only show "No favorites found" if we are searching (in any mode) OR browsing a single folder, AND result is empty */}
      {/* Specifically: 
          1. "all" mode: show if searchText is present AND items is empty. (If no text, we showed the other empty view above)
          2. single mode: show if items is empty (whether searching or not) 
      */}
      {((selectedFolderId === "all" && !!searchText) ||
        selectedFolderId !== "all") &&
        items.length === 0 &&
        !isLoading && (
          <List.EmptyView title="No favorites found" icon={Icon.Star} />
        )}
    </List>
  );
}

function FavItem({
  item,
  stats,
  isShowingDetail,
  onToggleDetail,
}: {
  item: VideoItem;
  stats?: VideoStats;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const bvid = item.bvid;
  const title = item.title;
  const cover = ensureHttps(item.pic);
  const url = ensureHttps(item.arcurl);

  const description = stats?.desc || item.description || "No description";

  const play = stats?.view || item.play || 0;
  const like = stats?.like || item.like || 0;
  const coin = stats?.coin || 0;
  const fav = stats?.favorite || item.favorites || 0;
  const share = stats?.share || 0;
  const reply = stats?.reply || item.review || 0;
  const danmaku = stats?.danmaku || item.video_review || 0;

  const authorName = stats?.owner?.name || item.author;
  const authorFace = stats?.owner?.face || item.owner?.face;

  const tags = useMemo(() => {
    const raw = (stats?.tag || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter(Boolean);
  }, [stats?.tag]);

  const detailMarkdown = useMemo(() => {
    return `
![Cover](${cover})

# ${title}

${description}
    `;
  }, [cover, title, description]);

  const metadata = useMemo(() => {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Author"
          text={authorName}
          icon={
            authorFace
              ? { source: ensureHttps(authorFace), mask: Image.Mask.Circle }
              : undefined
          }
        />
        <List.Item.Detail.Metadata.Label
          title="Data"
          text={`⏯ ${formatNumber(play)}   ▲ ${formatNumber(like)}   ₿ ${formatNumber(
            coin,
          )}   ★ ${formatNumber(fav)}   ↪ ${formatNumber(share)}   “ ${formatNumber(
            reply,
          )}   ※ ${formatNumber(danmaku)}`}
        />
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={formatDuration(item.duration)}
        />
        <List.Item.Detail.Metadata.Label
          title="Publish"
          text={new Date(item.pubdate * 1000).toLocaleString()}
        />
        <List.Item.Detail.Metadata.TagList title="Tags">
          {tags.length > 0 ? (
            tags.map((t) => (
              <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
            ))
          ) : (
            <List.Item.Detail.Metadata.TagList.Item
              key="__loading__"
              text={stats ? "—" : "Loading..."}
            />
          )}
        </List.Item.Detail.Metadata.TagList>
      </List.Item.Detail.Metadata>
    );
  }, [
    authorName,
    authorFace,
    play,
    like,
    coin,
    fav,
    share,
    reply,
    danmaku,
    item.duration,
    item.pubdate,
    tags,
    stats,
  ]);

  return (
    <List.Item
      id={bvid}
      title={title}
      subtitle={!isShowingDetail ? authorName : undefined}
      icon={
        !isShowingDetail
          ? { source: cover, mask: Image.Mask.RoundedRectangle }
          : undefined
      }
      accessories={
        !isShowingDetail
          ? [
              ...(play > 0 ? [{ text: `⏯ ${formatNumber(play)}` }] : []),
              { text: formatDuration(item.duration) },
              {
                date: new Date(item.pubdate * 1000),
                tooltip: new Date(item.pubdate * 1000).toLocaleString(),
              },
            ]
          : undefined
      }
      detail={
        <List.Item.Detail markdown={detailMarkdown} metadata={metadata} />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} title="Open Video" />
          <Action.CopyToClipboard content={url} title="Copy Link" />
          <ActionPanel.Section title="View Options">
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              icon={isShowingDetail ? Icon.EyeSlash : Icon.Eye}
              shortcut={{ modifiers: ["ctrl"], key: "b" }}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
