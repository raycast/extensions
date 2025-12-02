import { Action, ActionPanel, getPreferenceValues, Icon, List, LocalStorage, open } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import axios from "axios";
import { decompressFromUTF16 } from "lz-string";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Card, Collection, CollectionWithCards, Label, Space, SyncData } from "./type";
import Fuse from "fuse.js";
import { pinyin } from "pinyin-pro";
import { GITHUB_API, GITEE_API, CACHE_DURATION } from "./const";

// 配置常量
const { gistProvider, gistId: GIST_ID, accessToken: GIST_ACCESS_TOKEN } = getPreferenceValues();
const CACHE_KEY = `taby_data_cache_${gistProvider}_${GIST_ID}`;
const FUSE_SEARCH_KEYS = ["title", "description", "url", "titlePinyin", "descriptionPinyin"];
const FUSE_SEARCH_THRESHOLD = 0.3;

export default function Command() {
  const {
    value: selectedSpace,
    setValue: setSelectedSpace,
    isLoading: isSelectedSpaceLoading,
  } = useLocalStorage<string | undefined>("selectedSpace");
  const [searchText, setSearchText] = useState<string>("");
  const { data, error, isLoading, mutate } = useSWR<SyncData>(
    {
      gistId: GIST_ID as string,
      accessToken: GIST_ACCESS_TOKEN as string,
    },
    fetchRemoteDataWithCache,
  );

  const spaces = useMemo(() => {
    if (data && !isLoading) {
      return treeifyRemoteData(data);
    }
  }, [data, isLoading]);

  // 当 spaces 加载完成时，如果没有选择或选择无效，自动选择第一个 space
  useEffect(() => {
    if (spaces && spaces.length > 0 && !isSelectedSpaceLoading) {
      if (!selectedSpace) {
        // 如果没有选择，选择第一个
        setSelectedSpace(String(spaces[0].id));
      } else {
        // 如果选择的值不存在，也选择第一个
        const exists = spaces.some((space) => String(space.id) === selectedSpace);
        if (!exists) {
          setSelectedSpace(String(spaces[0].id));
        }
      }
    }
  }, [spaces, selectedSpace, isSelectedSpaceLoading, setSelectedSpace]);

  const selectedSpaceData = useMemo(() => {
    if (spaces && selectedSpace) {
      return spaces.find((space) => String(space.id) === selectedSpace);
    }
  }, [spaces, selectedSpace]);

  const cardsWithPinyin = useMemo(() => {
    if (!selectedSpaceData) return [];

    const allCards = selectedSpaceData.collections.flatMap((collection) => collection.cards);
    return allCards.map((card) => ({
      ...card,
      titlePinyin: getPinyin(card.title || card.customTitle || ""),
      descriptionPinyin: getPinyin(card.description || card.customDescription || ""),
    }));
  }, [selectedSpaceData]);

  const fuse = useMemo(
    () =>
      new Fuse(cardsWithPinyin, {
        keys: FUSE_SEARCH_KEYS,
        threshold: FUSE_SEARCH_THRESHOLD,
      }),
    [cardsWithPinyin],
  );

  const filteredCards = useMemo(() => {
    if (!selectedSpaceData) return [];

    const allCards = selectedSpaceData.collections.flatMap((collection) => collection.cards);
    if (!searchText.trim()) return allCards;

    const searchResults = fuse.search(searchText);
    return searchResults.map((result) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { titlePinyin, descriptionPinyin, ...card } = result.item;
      return card;
    });
  }, [selectedSpaceData, searchText, fuse]);

  const displayCollections = useMemo(() => {
    if (!selectedSpaceData) return [];
    if (!searchText.trim()) return selectedSpaceData.collections;

    // 按 collection 分组过滤后的卡片
    const cardsByCollectionId = groupCardsByCollectionId(filteredCards);

    return selectedSpaceData.collections
      .map((collection) => ({
        ...collection,
        cards: cardsByCollectionId.get(collection.id) || [],
      }))
      .filter((collection) => collection.cards.length > 0);
  }, [selectedSpaceData, filteredCards, searchText]);

  const openCurrentCollectionCards = async (collectionId: number) => {
    const collection = selectedSpaceData?.collections.find((c) => c.id === collectionId);
    if (!collection?.cards.length) return;

    const validUrls = collection.cards.map((card) => card.url).filter((url) => url?.startsWith("http"));

    await Promise.all(validUrls.map((url) => open(url)));
  };

  const refreshData = async () => {
    await LocalStorage.removeItem(CACHE_KEY);
    await mutate();
  };

  if (error) {
    return <List isLoading={false} searchBarPlaceholder="Error loading data" />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search cards by pinyin, title, description, url"
      searchBarAccessory={
        selectedSpace ? (
          <List.Dropdown
            tooltip="Select Space"
            value={selectedSpace}
            isLoading={isSelectedSpaceLoading}
            onChange={setSelectedSpace}
          >
            {spaces?.map((space) => (
              <List.Dropdown.Item key={space.id} value={String(space.id)} title={space.title} />
            ))}
          </List.Dropdown>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh Data"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshData}
          />
        </ActionPanel>
      }
    >
      {displayCollections.map((collection) => (
        <List.Section key={collection.id} title={collection.title} subtitle={`${collection.cards.length} cards`}>
          {collection.cards.map((card) => (
            <List.Item
              key={card.id}
              title={card.title}
              subtitle={card.description || card.customDescription}
              icon={{ source: card.favicon || Icon.Globe }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={card.url} />
                  <Action
                    icon={Icon.AirplaneTakeoff}
                    title="Open Current Collection Cards"
                    onAction={() => openCurrentCollectionCards(collection.id)}
                  />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh Data"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface SpaceWithCollectionsAndCards extends Space {
  collections: CollectionWithCards[];
}

/**
 * 将扁平数据转换为树形结构
 */
const treeifyRemoteData = (data: SyncData): SpaceWithCollectionsAndCards[] => {
  const labelsMap = buildLabelsMap(data.labels);
  const collectionsBySpaceId = groupCollectionsBySpaceId(data.collections);
  const cardsByCollectionId = groupCardsByCollectionId(data.cards);

  return data.spaces.sort(byOrder).map((space) => ({
    ...space,
    collections: (collectionsBySpaceId.get(space.id) || []).sort(byOrder).map(
      (collection): CollectionWithCards => ({
        ...collection,
        cards: (cardsByCollectionId.get(collection.id) || []).sort(byOrder),
        labels: getLabelsForCollection(collection.labelIds, labelsMap),
      }),
    ),
  }));
};

/**
 * 构建标签映射表
 */
const buildLabelsMap = (labels: Label[]): Map<number, Label> => {
  const map = new Map<number, Label>();
  labels.forEach((label) => map.set(label.id, label));
  return map;
};

/**
 * 按 spaceId 分组 collections
 */
const groupCollectionsBySpaceId = (collections: Collection[]): Map<number, Collection[]> => {
  const map = new Map<number, Collection[]>();
  collections.forEach((collection) => {
    const spaceId = collection.spaceId;
    if (!map.has(spaceId)) map.set(spaceId, []);
    map.get(spaceId)!.push(collection);
  });
  return map;
};

/**
 * 按 collectionId 分组 cards
 */
const groupCardsByCollectionId = (cards: Card[]): Map<number, Card[]> => {
  const map = new Map<number, Card[]>();
  cards.forEach((card) => {
    const collectionId = card.collectionId;
    if (!map.has(collectionId)) map.set(collectionId, []);
    map.get(collectionId)!.push(card);
  });
  return map;
};

/**
 * 获取 collection 对应的 labels
 */
const getLabelsForCollection = (labelIds: number[], labelsMap: Map<number, Label>): Label[] => {
  return labelIds.map((id) => labelsMap.get(id)).filter((label): label is Label => label !== undefined);
};

/**
 * 按 order 字段排序的比较函数
 */
const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order || 0) - (b.order || 0);

/**
 * 带缓存的远程数据获取函数
 * 如果缓存存在且未过期，直接返回缓存数据；否则重新获取数据并更新缓存
 */
const fetchRemoteDataWithCache = async (params: { gistId: string; accessToken: string }): Promise<SyncData> => {
  const cachedData = await getCachedData();
  if (cachedData) return cachedData;

  const newData = await fetchRemoteData(params);
  await saveCachedData(newData);
  return newData;
};

/**
 * 从缓存中获取数据（如果存在且未过期）
 */
const getCachedData = async (): Promise<SyncData | null> => {
  try {
    const cachedStr = await LocalStorage.getItem(CACHE_KEY);
    if (!cachedStr) return null;

    const { data, timestamp } = JSON.parse(cachedStr as string);
    const isExpired = Date.now() - timestamp >= CACHE_DURATION;

    return isExpired ? null : data;
  } catch {
    return null;
  }
};

/**
 * 保存数据到缓存
 */
const saveCachedData = async (data: SyncData): Promise<void> => {
  try {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error("Failed to save cache:", error);
  }
};

/**
 * 从远程获取数据
 */
const fetchRemoteData = async (params: { gistId: string; accessToken: string }): Promise<SyncData> => {
  const apiBaseUrl = gistProvider === "github" ? GITHUB_API : GITEE_API;
  const response = await axios<GistResponse>({
    baseURL: `${apiBaseUrl}/gists/${params.gistId}`,
    url: "",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const remoteData = parseGistFiles(response.data.files);
  enrichCardsWithFavicons(remoteData);

  return remoteData;
};

/**
 * 解析 Gist 文件内容
 */
const parseGistFiles = (files: GistResponse["files"]): SyncData => {
  const parseFile = (file: { content: string } | undefined) => {
    return file ? JSON.parse(decompressFromUTF16(file.content)) : [];
  };

  return {
    spaces: parseFile(files.spaces),
    collections: parseFile(files.collections),
    labels: parseFile(files.labels),
    cards: parseFile(files.cards),
    favicons: parseFile(files.favicons),
  };
};

/**
 * 为卡片添加 favicon
 */
const enrichCardsWithFavicons = (data: SyncData): void => {
  data.cards.forEach((card) => {
    card.favicon = resolveCardFavicon(card, data.favicons);
  });
};

/**
 * 解析卡片的 favicon
 */
const resolveCardFavicon = (card: Card, favicons: SyncData["favicons"]): string | undefined => {
  // 如果已有 favicon 字符串，直接使用
  if (typeof card.favicon === "string") {
    return card.favicon.startsWith("http") ? getWsrvFavicon(card.favicon) : card.favicon;
  }

  // 如果有 faviconId，从 favicons 中查找
  if (typeof card.faviconId === "number") {
    const faviconUrl = favicons.find((f) => f.id === card.faviconId)?.url;
    if (faviconUrl) {
      return faviconUrl.startsWith("http") ? getWsrvFavicon(faviconUrl) : faviconUrl;
    }
  }

  // 特殊 URL 处理
  if (card.url.startsWith("chrome://")) {
    return undefined;
  }

  // 默认使用 Google Favicon 服务
  return getGoogleFavicon(card.url);
};

/**
 * Gist API 响应类型
 */
interface GistResponse {
  files: {
    spaces?: { content: string };
    collections?: { content: string };
    labels?: { content: string };
    cards?: { content: string };
    favicons?: { content: string };
  };
}

function getGoogleFavicon(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

function getWsrvFavicon(url: string) {
  return `https://wsrv.nl/?url=${url}&page=-1&default=1`;
}

/**
 * 获取文本的拼音（首字母和全拼）
 * 例如："百度" -> "baidu bd"
 */
function getPinyin(text: string): string {
  if (!text) {
    return "";
  }
  try {
    // 获取全拼（去除声调，小写）
    const fullPinyin = pinyin(text, { toneType: "none" }).toLowerCase().replace(/\s+/g, "");
    // 获取首字母
    const firstLetters = pinyin(text, { pattern: "first", toneType: "none" }).toLowerCase().replace(/\s+/g, "");
    // 返回全拼和首字母，用空格分隔
    return `${fullPinyin} ${firstLetters}`.trim();
  } catch {
    return text;
  }
}
