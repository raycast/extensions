import {
  ActionPanel,
  List,
  Action,
  Icon,
  Image,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  searchBilibili,
  SearchType,
  AnyItem,
  VideoItem,
  BangumiItem,
  MovieItem,
  LiveItem,
  ArticleItem,
  formatNumber,
  formatDuration,
  ensureHttps,
  getVideoDetails,
  VideoStats,
  getPopularVideos,
  getFollowings,
  getUserCard,
  UserItem,
  checkFollowingsChanged,
  getCachedUserStats,
  saveCachedUserStats,
  getFollowedBangumi,
  getFollowedCinema,
  SeasonStats,
  getSeasonDetails,
} from "./utils/bilibili-api";

interface SearchArguments {
  query?: string;
}

export default function Command(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [searchType, setSearchType] = useState<SearchType>("video");
  const [results, setResults] = useState<AnyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [videoStats, setVideoStats] = useState<Record<string, VideoStats>>({});
  const [userStats, setUserStats] = useState<Record<string, UserItem>>({});
  const [seasonStats, setSeasonStats] = useState<Record<string, SeasonStats>>(
    {},
  );

  // Load cached user stats on mount
  useEffect(() => {
    getCachedUserStats().then((cached) => {
      if (cached) {
        setUserStats(cached);
      }
    });
  }, []);

  // Debounce search
  useEffect(() => {
    /*
    if (!searchText) {
      setResults([]);
      return;
    }
    */
    setPage(1);
    setVideoStats({}); // Clear stats on new search
    // Note: We might want to clear userStats too, or keep them cached.
    // Let's keep userStats cached for now as mids are stable.
  }, [searchText]);

  const performSearch = useCallback(
    async (newPage = 1) => {
      // Allow execution even if searchText is empty to show popular videos

      setIsLoading(true);
      try {
        let data: AnyItem[] = [];
        if (!searchText || searchText.startsWith(":")) {
          if (searchType === "video" && !searchText) {
            // Fetch popular videos (supports pagination)
            data = await getPopularVideos(newPage);
          } else if (searchType === "bili_user") {
            // Check if followings changed
            // Check if followings changed, only on first page to avoid rate limiting
            // and redundant checks during pagination
            let hasChanged = false;
            if (newPage === 1) {
              hasChanged = await checkFollowingsChanged();
            }

            const isLocalSearch = searchText.startsWith(":");
            const fetchAll = isLocalSearch;

            const followings = await getFollowings(newPage, false, fetchAll);

            if (isLocalSearch) {
              const keyword = searchText.slice(1).trim().toLowerCase();
              if (keyword) {
                data = followings.filter((u) =>
                  u.uname.toLowerCase().includes(keyword),
                );
              } else {
                data = followings;
              }
            } else {
              data = followings;
            }

            // If list changed, clear stats to trigger refetch
            if (hasChanged && newPage === 1) {
              setUserStats({});
            }
          } else if (searchType === "media_bangumi") {
            const isLocalSearch = searchText.startsWith(":");
            const fetchAll = isLocalSearch;

            const bangumis = await getFollowedBangumi(newPage, false, fetchAll);
            if (isLocalSearch) {
              const keyword = searchText.slice(1).trim().toLowerCase();
              if (keyword) {
                data = bangumis.filter((b) =>
                  b.title.toLowerCase().includes(keyword),
                );
              } else {
                data = bangumis;
              }
            } else {
              data = bangumis;
            }
          } else if (searchType === "media_ft") {
            const isLocalSearch = searchText.startsWith(":");
            const fetchAll = isLocalSearch;

            const movies = await getFollowedCinema(newPage, false, fetchAll);
            if (isLocalSearch) {
              const keyword = searchText.slice(1).trim().toLowerCase();
              if (keyword) {
                data = movies.filter((m) =>
                  m.title.toLowerCase().includes(keyword),
                );
              } else {
                data = movies;
              }
            } else {
              data = movies;
            }
          } else {
            if (searchText) {
              // Should not happen if we check !searchText, but added for safety if logic changes
              data = await searchBilibili(searchText, searchType, newPage);
            } else {
              data = [];
            }
          }
        } else {
          data = await searchBilibili(searchText, searchType, newPage);
        }
        if (newPage === 1) {
          setResults(data);
        } else {
          setResults((prev) => {
            // Deduplicate based on BVID for video items, or fallback to simple id check with type guard
            if (!data.length) return prev;

            // Create a set of existing IDs to check against
            const existingIds = new Set(
              prev.map((i) => {
                if ("bvid" in i) return i.bvid;
                if ("id" in i) return String(i.id);
                if ("media_id" in i) return String(i.media_id);
                return "";
              }),
            );

            const newData = data.filter((i) => {
              let id = "";
              if ("bvid" in i) id = i.bvid;
              else if ("id" in i) id = String(i.id);
              else if ("media_id" in i) id = String(i.media_id);
              return id ? !existingIds.has(id) : true;
            });

            return [...prev, ...newData];
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [searchText, searchType],
  );

  useEffect(() => {
    // Initial load (recommendations) or search change
    performSearch(1);
  }, [searchText]); // Only re-run when searchText changes. searchType change is handled by performSearch logic but we might want to reset if type changes AND we are searching. But for empty search (recommendations) type doesn't matter much or we only show video recommendations.

  useEffect(() => {
    // When searchType changes, we should re-search.
    // If searchText is empty, it will fetch popular videos (if we decide popular videos are category-agnostic or we want to filter them).
    // The current getPopularVideos is global, but let's re-trigger to be safe or if we later add category support.
    performSearch(1);
  }, [searchType]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    performSearch(nextPage);
  };

  // Batch fetch stats for new items
  useEffect(() => {
    if (searchType !== "video") return;

    const fetchMissingStats = async () => {
      const missingBvids = results
        .filter((item): item is VideoItem => "bvid" in item)
        .map((item) => item.bvid)
        .filter((bvid) => !videoStats[bvid]);

      if (missingBvids.length === 0) return;

      const newStats: Record<string, VideoStats> = {};
      const chunkSize = 5;
      for (let i = 0; i < missingBvids.length; i += chunkSize) {
        const chunk = missingBvids.slice(i, i + chunkSize);
        const promises = chunk.map(async (bvid) => {
          const stats = await getVideoDetails(bvid);
          if (stats) {
            newStats[bvid] = stats;
          }
        });
        await Promise.all(promises);
        setVideoStats((prev) => ({ ...prev, ...newStats }));
      }
    };

    fetchMissingStats();
  }, [results, searchType]);

  // Batch fetch stats for users
  useEffect(() => {
    if (searchType !== "bili_user") return;

    const fetchMissingUserStats = async () => {
      const missingMids = results
        .filter((item): item is UserItem => item.type === "bili_user")
        .map((item) => item.mid)
        .filter((mid) => !userStats[mid]);

      if (missingMids.length === 0) return;

      const newUserStats: Record<string, UserItem> = {};
      const chunkSize = 5;
      for (let i = 0; i < missingMids.length; i += chunkSize) {
        const chunk = missingMids.slice(i, i + chunkSize);
        const promises = chunk.map(async (mid) => {
          const stats = await getUserCard(mid);
          if (stats) {
            newUserStats[mid] = stats;
          }
        });

        await Promise.all(promises);
        setUserStats((prev) => {
          const next = { ...prev, ...newUserStats };
          saveCachedUserStats(next);
          return next;
        });
      }
    };

    fetchMissingUserStats();
  }, [results, searchType]);

  // Batch fetch stats for seasons (bangumi, cinema)
  useEffect(() => {
    if (searchType !== "media_bangumi" && searchType !== "media_ft") return;

    const fetchMissingSeasonStats = async () => {
      const missingSeasonIds = results
        .filter(
          (item): item is BangumiItem | MovieItem =>
            item.type === "media_bangumi" || item.type === "media_ft",
        )
        .filter((item) => "season_id" in item && item.season_id)
        .map((item) => (item as any).season_id)
        .filter((seasonId) => !seasonStats[seasonId]);

      if (missingSeasonIds.length === 0) return;

      const newStats: Record<string, SeasonStats> = {};
      const chunkSize = 5;
      for (let i = 0; i < missingSeasonIds.length; i += chunkSize) {
        const chunk = missingSeasonIds.slice(i, i + chunkSize);
        const promises = chunk.map(async (seasonId) => {
          const stats = await getSeasonDetails(seasonId);
          if (stats) {
            newStats[seasonId] = stats;
          }
        });

        await Promise.all(promises);
        setSeasonStats((prev) => ({ ...prev, ...newStats }));
      }
    };

    fetchMissingSeasonStats();
  }, [results, searchType]);

  const categories: { label: string; value: SearchType }[] = [
    { label: "Video", value: "video" },
    { label: "Anime", value: "media_bangumi" },
    { label: "Movie/TV", value: "media_ft" },
    { label: "Live", value: "live" },
    { label: "Article", value: "article" },
    { label: "User", value: "bili_user" },
  ];

  const cycleCategory = (direction: 1 | -1) => {
    const currentIndex = categories.findIndex((c) => c.value === searchType);
    let nextIndex = currentIndex + direction;
    if (nextIndex >= categories.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = categories.length - 1;
    setSearchType(categories[nextIndex].value);
  };

  const toggleDetail = () => {
    setIsShowingDetail((prev) => !prev);
  };

  const handleRefreshUserData = async () => {
    // Force refresh user data
    await getFollowings(1, true);
    setUserStats({});
    // Trigger re-search
    performSearch(1);
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search Bilibili..."
      isShowingDetail={isShowingDetail && results.length > 0}
      throttle={true}
      pagination={{
        onLoadMore: handleLoadMore,
        // Popular videos and Search results support pagination
        hasMore: results.length > 0 && results.length % 20 === 0,
        pageSize: 20,
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Category"
          value={searchType}
          onChange={(newValue) => setSearchType(newValue as SearchType)}
        >
          {categories.map((cat) => (
            <List.Dropdown.Item
              key={cat.value}
              title={cat.label}
              value={cat.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {results.map((item, index) => {
        const type = (item.type as SearchType) || searchType;
        const id =
          type === "video" && "bvid" in item
            ? (item as VideoItem).bvid
            : String(index);
        return (
          <SearchResultItem
            key={`${id}-${index}`}
            id={id}
            item={item}
            searchType={type}
            onCycleCategory={cycleCategory}
            isShowingDetail={isShowingDetail}
            onToggleDetail={toggleDetail}
            videoStats={
              type === "video" && "bvid" in item
                ? videoStats[(item as VideoItem).bvid]
                : undefined
            }
            userStats={
              type === "bili_user"
                ? userStats[(item as UserItem).mid]
                : undefined
            }
            seasonStats={
              (type === "media_bangumi" || type === "media_ft") &&
              "season_id" in item
                ? seasonStats[(item as any).season_id]
                : undefined
            }
            onRefreshUserData={handleRefreshUserData}
            searchText={searchText}
          />
        );
      })}
      {results.length === 0 && !isLoading && (
        <List.EmptyView title="No results found" icon={Icon.MagnifyingGlass} />
      )}
    </List>
  );
}

function SearchResultItem({
  id,
  item,
  searchType,
  onCycleCategory,
  isShowingDetail,
  onToggleDetail,
  videoStats,
  userStats,
  seasonStats,
  onRefreshUserData,
  searchText,
}: {
  id: string;
  item: AnyItem;
  searchType: SearchType;
  onCycleCategory: (dir: 1 | -1) => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  videoStats?: VideoStats;
  userStats?: UserItem;
  seasonStats?: SeasonStats;
  onRefreshUserData?: () => void;
  searchText: string;
}) {
  let title = "";
  let cover = "";
  let url = "";
  let detailMarkdown = "";
  let metadata: any = null;

  // Protocol Check handled inside specific types via ensureHttps

  // Common Actions
  const commonActions = (targetUrl: string) => (
    <ActionPanel>
      <Action.OpenInBrowser url={targetUrl} title="Open Item in Browser" />
      {searchText.trim().length > 0 && (
        <Action.OpenInBrowser
          title="Search in Browser"
          url={`https://search.bilibili.com/all?keyword=${encodeURIComponent(searchText.trim())}`}
          shortcut={{ modifiers: ["ctrl"], key: "enter" }}
        />
      )}
      <Action.CopyToClipboard
        content={targetUrl}
        title="Copy Link"
        shortcut={{ modifiers: ["ctrl"], key: "c" }}
      />

      <ActionPanel.Section title="View Options">
        <Action
          title={isShowingDetail ? "Hide Details" : "Show Details"}
          icon={isShowingDetail ? Icon.EyeSlash : Icon.Eye}
          shortcut={{ modifiers: ["ctrl"], key: "b" }}
          onAction={onToggleDetail}
        />
      </ActionPanel.Section>

      {searchType === "bili_user" && onRefreshUserData && (
        <ActionPanel.Section title="User Actions">
          <Action
            title="Refresh User Data"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={onRefreshUserData}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Navigation">
        <Action
          title="Next Category"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["ctrl"], key: "arrowRight" }}
          onAction={() => onCycleCategory(1)}
        />
        <Action
          title="Previous Category"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["ctrl"], key: "arrowLeft" }}
          onAction={() => onCycleCategory(-1)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  if (searchType === "video") {
    const v = item as VideoItem;
    title = removeHtmlTags(v.title);
    cover = ensureHttps(v.pic);
    url = ensureHttps(v.arcurl);

    detailMarkdown = `
![Cover](${cover})

# ${title}

${v.description || "No description"}
        `;

    // Use stats from videoStats if available, otherwise use basic info from search result
    const like = videoStats?.like ?? v.like ?? 0;
    const coin = videoStats?.coin ?? 0;
    const fav = videoStats?.favorite ?? v.favorites;
    const share = videoStats?.share ?? 0;
    const reply = videoStats?.reply ?? v.review;
    const danmaku = videoStats?.danmaku ?? v.video_review;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Author"
          text={v.author}
          icon={
            v.owner?.face
              ? { source: ensureHttps(v.owner.face), mask: Image.Mask.Circle }
              : undefined
          }
        />
        <List.Item.Detail.Metadata.Label
          title="Data"
          text={`⏯ ${formatNumber(v.play)}   ▲ ${formatNumber(like)}   ₿ ${formatNumber(coin)}   ★ ${formatNumber(fav)}   ↪ ${formatNumber(share)}   “ ${formatNumber(reply)}   ※ ${formatNumber(danmaku)}`}
        />
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={formatDuration(v.duration)}
        />
        <List.Item.Detail.Metadata.Label
          title="Publish"
          text={new Date(v.pubdate * 1000).toLocaleString()}
        />

        <List.Item.Detail.Metadata.TagList title="Tags">
          {(videoStats?.tag || v.tag || "")
            .split(",")
            .filter((t) => t.trim().length > 0)

            .map((t) => (
              <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
            ))}
        </List.Item.Detail.Metadata.TagList>
      </List.Item.Detail.Metadata>
    );
  } else if (searchType === "media_bangumi") {
    const b = item as BangumiItem;
    title = removeHtmlTags(b.title);
    cover = ensureHttps(b.cover);
    url = ensureHttps(b.url);

    const score =
      seasonStats && seasonStats.score > 0
        ? seasonStats.score
        : b.media_score?.score;
    const scoreText = score ? String(score) : "N/A";
    const cvText = seasonStats?.actors || b.cv || "N/A";
    const staffText = seasonStats?.staff || b.staff || "N/A";

    const subtitleText = [b.styles, b.release_date_show, b.index_show]
      .filter(Boolean)
      .join(" · ");

    detailMarkdown = `
![Cover](${cover})

# ${title}

**Synopsis:**
${b.desc || "No description"}
        `;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Score"
          text={`⭐ ${scoreText}`}
        />
        <List.Item.Detail.Metadata.Label
          title="Data"
          text={`▶ ${formatNumber(b.stat?.view || 0)}   ♥ ${formatNumber(b.stat?.follow || 0)}   ※ ${formatNumber(b.stat?.danmaku || 0)}`}
        />
        <List.Item.Detail.Metadata.Label title="Genre" text={subtitleText} />
        <List.Item.Detail.Metadata.Label title="Staff" text={staffText} />
        <List.Item.Detail.Metadata.Label title="CV" text={cvText} />
        <List.Item.Detail.Metadata.Label title="Areas" text={b.areas} />
      </List.Item.Detail.Metadata>
    );
  } else if (searchType === "media_ft") {
    const m = item as MovieItem;
    title = removeHtmlTags(m.title);
    cover = ensureHttps(m.cover);
    url = ensureHttps(m.url);

    const score =
      seasonStats && seasonStats.score > 0
        ? seasonStats.score
        : m.media_score?.score;
    const scoreText = score ? String(score) : "N/A";
    const actorsText = seasonStats?.actors || m.actors || "N/A";
    const staffText = seasonStats?.staff || m.staff || "N/A";

    const subtitleText = [m.styles, m.release_date_show, m.index_show]
      .filter(Boolean)
      .join(" · ");

    detailMarkdown = `
![Cover](${cover})

# ${title}

**Synopsis:**
${m.desc || "No description"}
        `;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Score"
          text={`⭐ ${scoreText}`}
        />
        <List.Item.Detail.Metadata.Label
          title="Data"
          text={`▶ ${formatNumber(m.stat?.view || 0)}   ♥ ${formatNumber(m.stat?.follow || 0)}   ※ ${formatNumber(m.stat?.danmaku || 0)}`}
        />
        <List.Item.Detail.Metadata.Label title="Genre" text={subtitleText} />
        <List.Item.Detail.Metadata.Label title="Staff" text={staffText} />
        <List.Item.Detail.Metadata.Label title="Actors" text={actorsText} />
        <List.Item.Detail.Metadata.Label title="Areas" text={m.areas} />
      </List.Item.Detail.Metadata>
    );
  } else if (searchType === "live") {
    const l = item as LiveItem;
    title = removeHtmlTags(l.title);
    cover = ensureHttps(l.cover);
    url = `https://live.bilibili.com/${l.roomid}`;

    detailMarkdown = `
![Cover](${cover})

# ${title}

**Host**: ${l.uname}
**Category**: ${l.cate_name}
**Time**: ${l.live_time}

Tags: ${l.tags}
        `;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Room ID"
          text={String(l.roomid)}
        />
        <List.Item.Detail.Metadata.Label
          title="Online"
          text={formatNumber(l.online)}
        />
        <List.Item.Detail.Metadata.Label
          title="Host"
          text={l.uname}
          icon={{ source: ensureHttps(l.user_cover), mask: Image.Mask.Circle }}
        />
      </List.Item.Detail.Metadata>
    );
  } else if (searchType === "article") {
    const a = item as ArticleItem;
    title = removeHtmlTags(a.title);
    cover = a.cover && a.cover[0] ? ensureHttps(a.cover[0]) : "";
    url = `https://www.bilibili.com/read/cv${a.id}`;

    detailMarkdown = `
![Cover](${cover})

# ${title}

${a.desc || "No summary"}
        `;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Views"
          text={formatNumber(a.view)}
        />
        <List.Item.Detail.Metadata.Label
          title="Likes"
          text={formatNumber(a.like)}
        />
        <List.Item.Detail.Metadata.Label
          title="Replies"
          text={formatNumber(a.reply)}
        />
      </List.Item.Detail.Metadata>
    );
  } else if (searchType === "bili_user") {
    const u = item as UserItem;
    // Use userStats if available, otherwise fallback to item data
    const stats = userStats || u;

    title = stats.uname;
    cover = ensureHttps(stats.upic);
    url = `https://space.bilibili.com/${stats.mid}`;

    detailMarkdown = `
![Avatar](${cover})

# ${title}

${stats.usign || "No bio"}
        `;

    metadata = (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Name"
          text={stats.uname}
          icon={
            stats.upic
              ? { source: ensureHttps(stats.upic), mask: Image.Mask.Circle }
              : undefined
          }
        />
        <List.Item.Detail.Metadata.Label title="UID" text={String(stats.mid)} />
        {stats.official_verify && stats.official_verify.desc && (
          <List.Item.Detail.Metadata.Label
            title="Title"
            text={stats.official_verify.desc}
            icon={Icon.CheckCircle}
          />
        )}
        <List.Item.Detail.Metadata.Label
          title="Level"
          text={`Lv.${stats.level}`}
        />
        <List.Item.Detail.Metadata.Label
          title="Fans"
          text={formatNumber(stats.fans)}
        />
        <List.Item.Detail.Metadata.Label
          title="Following"
          text={formatNumber(stats.following || 0)}
        />
        <List.Item.Detail.Metadata.Label
          title="Videos"
          text={formatNumber(stats.videos)}
        />
        <List.Item.Detail.Metadata.Label
          title="Bio"
          text={stats.usign || "-"}
        />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={
        !isShowingDetail
          ? searchType === "bili_user"
            ? userStats?.usign || (item as UserItem).usign || ""
            : searchType === "media_bangumi" || searchType === "media_ft"
              ? [
                  (item as any).styles,
                  (item as any).release_date_show,
                  (item as any).index_show,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : (item as any).author || (item as any).uname
          : undefined
      }
      icon={
        !isShowingDetail
          ? { source: cover, mask: Image.Mask.Circle }
          : undefined
      }
      accessories={
        !isShowingDetail
          ? searchType === "bili_user"
            ? [
                {
                  text: `Fans: ${formatNumber(userStats?.fans ?? (item as UserItem).fans)}`,
                },
                {
                  text: `Videos: ${formatNumber(userStats?.videos ?? (item as UserItem).videos)}`,
                },
              ]
            : searchType === "media_bangumi" || searchType === "media_ft"
              ? [
                  {
                    text: `▶ ${formatNumber((item as any).stat?.view || 0)}`,
                  },
                  {
                    text: `★ ${(seasonStats && seasonStats.score > 0 ? seasonStats.score : (item as any).media_score?.score) || "N/A"}`,
                  },
                ]
              : [
                  {
                    text: `▶ ${formatNumber((item as any).play || (item as any).view || 0)}`,
                  },
                  { text: formatDuration((item as any).duration) },
                  {
                    date: (item as any).pubdate
                      ? new Date((item as any).pubdate * 1000)
                      : undefined,
                    tooltip: (item as any).pubdate
                      ? new Date((item as any).pubdate * 1000).toLocaleString()
                      : undefined,
                  },
                ]
          : undefined
      }
      detail={
        <List.Item.Detail markdown={detailMarkdown} metadata={metadata} />
      }
      actions={commonActions(url)}
    />
  );
}

function removeHtmlTags(str: string) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
}
