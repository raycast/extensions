import { ActionPanel, Action, List, Image, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  getHistory,
  VideoItem,
  formatDuration,
  formatNumber,
  ensureHttps,
  getVideoDetails,
  VideoStats,
} from "./utils/bilibili-api";
import { isLoggedIn } from "./utils/auth";

type HistoryCursor = {
  max: number;
  view_at: number;
  business: string;
  ps: number;
} | null;

export default function Command() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [cursor, setCursor] = useState<HistoryCursor>(null);
  const [videoStats, setVideoStats] = useState<Record<string, VideoStats>>({});

  const loggedIn = useMemo(() => isLoggedIn(), []);

  const fetchPage = async (next: HistoryCursor = null) => {
    setIsLoading(true);
    try {
      const data = await getHistory(next);

      if (next) {
        setItems((prev) => {
          const existing = new Set(prev.map((p) => p.bvid));
          const merged = [
            ...prev,
            ...data.list.filter((d) => !existing.has(d.bvid)),
          ];
          return merged;
        });
      } else {
        setItems(data.list);
      }

      setCursor(data.cursor);
    } catch (e) {
      console.error("Failed to fetch history", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) {
      setIsLoading(false);
      return;
    }

    // 每次进入命令，清空并重新拉取
    setItems([]);
    setVideoStats({});
    setCursor(null);
    fetchPage(null);
  }, [loggedIn]);

  // 与搜索命令一致：缺失 bvid -> 分批拉详情
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

        // 关键：只合并“本 chunk 的结果”，不要复用一个全局 newStats 反复合并
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
          description="Please login to view your history."
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
      searchBarPlaceholder="Search history..."
      pagination={{
        onLoadMore: () => cursor && fetchPage(cursor),
        hasMore: !!cursor,
        pageSize: 20,
      }}
    >
      {items.map((item, index) => (
        <HistoryItem
          key={`${item.bvid}-${index}`}
          item={item}
          stats={videoStats[item.bvid]}
          isShowingDetail={isShowingDetail}
          onToggleDetail={() => setIsShowingDetail((v) => !v)}
        />
      ))}
      <List.EmptyView title="No history found" icon={Icon.Clock} />
    </List>
  );
}

function HistoryItem({
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

  // 关键：TagList 永远存在，不要 “没 tags 就 return null”，避免 mount/unmount 导致闪烁/消失
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
