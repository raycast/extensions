import { ActionPanel, Action, List, showToast, Toast, Cache, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parser from "rss-parser";

// Define Language type
type Language = "nl" | "en";

// Initialize constants and global variables
const parser = new Parser();
const cache = new Cache();

// Dynamic cache key function
const getCacheKey = (language: Language) => `news-headlines-${language}`;

// Cache expiration duration (1 hour)
const CACHE_EXPIRATION_MS = 1000 * 60 * 60; // 1 hour

const MAX_ITEMS_PER_SOURCE = 50;
const MAX_CACHED_ITEMS = 500;
const ITEMS_PER_PAGE = 50;

// Extracted constants
const FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const TRANSLATIONS = {
  nl: {
    minute: "minuut",
    minutes: "minuten",
    hour: "uur",
    hours: "uren",
    day: "dag",
    days: "dagen",
    ago: "geleden",
    allSources: "Alle bronnen",
    latestHeadlines: "Laatste koppen",
    searchPlaceholder: "Zoek in nieuwsberichten...",
  },
  en: {
    minute: "minute",
    minutes: "minutes",
    hour: "hour",
    hours: "hours",
    day: "day",
    days: "days",
    ago: "ago",
    allSources: "All Sources",
    latestHeadlines: "Latest Headlines",
    searchPlaceholder: "Search headlines...",
  },
};

// Helper function to check cache validity
const checkCacheValidity = (cachedData: string | undefined, cacheTimestamp: string | undefined): boolean => {
  return !!cachedData && !!cacheTimestamp && Date.now() - parseInt(cacheTimestamp, 10) < CACHE_EXPIRATION_MS;
};

interface NewsSource {
  name: string;
  url: string;
}

const englishSources: NewsSource[] = [
  { name: "Dutch News", url: "https://www.dutchnews.nl/feed/" },
  { name: "IamExpat", url: "https://www.iamexpat.nl/rss/news-netherlands/news" },
  { name: "NL Times", url: "https://nltimes.nl/rssfeed2" },
  { name: "The Guardian - Netherlands", url: "https://www.theguardian.com/world/netherlands/rss" },
];

const dutchSources: NewsSource[] = [
  { name: "De Speld", url: "https://speld.nl/feed/" },
  { name: "De Telegraaf", url: "https://www.telegraaf.nl/rss" },
  { name: "De Volkskrant", url: "https://www.volkskrant.nl/voorpagina/rss.xml" },
  { name: "Het Parool", url: "https://www.parool.nl/rss.xml" },
  { name: "NOS", url: "https://feeds.nos.nl/nosnieuwsalgemeen" },
  { name: "NRC", url: "https://www.nrc.nl/rss/" },
  { name: "NU.nl", url: "https://www.nu.nl/rss/Algemeen" },
];

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  favicon: string;
  category?: string;
}

interface FeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  categories?: string[] | { name: string }[];
}

interface Preferences {
  language: string;
  showCategories: boolean;
}

// Helper function to get favicon URL
const getFaviconUrl = (url: string): string => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

// Helper function to format date based on language
const formatDate = (dateString: string, language: Language): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const t = TRANSLATIONS[language];

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? t.minute : t.minutes} ${t.ago}`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? t.hour : t.hours} ${t.ago}`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? t.day : t.days} ${t.ago}`;
  } else {
    return date.toLocaleString(language === "nl" ? "nl-NL" : "en-US", FORMAT_OPTIONS);
  }
};

// Helper function to parse date strings
const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();

  const date = new Date(dateString);

  if (!isNaN(date.getTime())) {
    return date;
  }

  // Handle the format: "11 September 2024 - 20:20"
  const match = dateString.match(/(\d{1,2}) (\w+) (\d{4}) - (\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = monthNames.findIndex((m) => m.toLowerCase().startsWith(month.toLowerCase()));
    if (monthIndex !== -1) {
      return new Date(parseInt(year), monthIndex, parseInt(day), parseInt(hour), parseInt(minute));
    }
  }

  console.error(`Failed to parse date: ${dateString}`);
  return new Date();
};

// Logging utility
const logError = (message: string, error: unknown) => {
  console.error(`[NewsExtension Error] ${message}`, error);
  // Future Integration: Send logs to an external service like Sentry
};

// Concurrency control utility
const promisePool = async <T, R>(tasks: T[], handler: (task: T) => Promise<R>, poolLimit: number): Promise<R[]> => {
  const ret: R[] = [];
  const executing = new Set<Promise<R>>();

  for (const task of tasks) {
    const p = handler(task).then((result) => {
      ret.push(result);
      executing.delete(p);
      return result;
    });
    executing.add(p);

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return ret;
};

// Function to fetch news with caching and improved error handling
const fetchNewsWithCache = async (sources: NewsSource[], language: Language, page: number): Promise<NewsItem[]> => {
  const cacheKey = getCacheKey(language);
  const cachedData = cache.get(cacheKey);
  const cacheTimestamp = cache.get(`${cacheKey}-timestamp`);

  const isCacheValid = checkCacheValidity(cachedData, cacheTimestamp);

  const itemsMap = new Map<string, NewsItem>();

  if (isCacheValid) {
    JSON.parse(cachedData!).forEach((item: NewsItem) => itemsMap.set(item.link, item));
  }

  const sourcesToFetch = sources.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const newItems = await promisePool(
    sourcesToFetch,
    async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        return feed.items.slice(0, MAX_ITEMS_PER_SOURCE).map((item: FeedItem) => ({
          title: item.title?.trim() || "No Title",
          link: item.link?.trim() || "#",
          pubDate: parseDate(item.pubDate || item.isoDate || "").toISOString(),
          source: source.name,
          favicon: getFaviconUrl(source.url),
          category: item.categories && typeof item.categories[0] === "string" ? item.categories[0] : undefined,
        }));
      } catch (error) {
        logError(`Error fetching ${source.name}`, error);
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch news from ${source.name}`,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return [];
      }
    },
    5, // Limit to 5 concurrent fetches
  );

  newItems.flat().forEach((item) => itemsMap.set(item.link, item));

  const sortedItems = Array.from(itemsMap.values())
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, MAX_CACHED_ITEMS);

  cache.set(cacheKey, JSON.stringify(sortedItems));
  cache.set(`${cacheKey}-timestamp`, Date.now().toString());

  return sortedItems;
};

// Function to get language based on preferences
const getLanguage = (preferenceLanguage: string): Language => {
  if (preferenceLanguage === "system") {
    const systemLanguage = getPreferenceValues<{ language: string }>().language.toLowerCase().split("-")[0];
    return systemLanguage === "nl" ? "nl" : "en";
  }
  return preferenceLanguage === "nl" ? "nl" : "en";
};

// Main component
export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [currentLanguage] = useState<Language>(getLanguage(preferences.language));
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const allSources = useMemo(() => (currentLanguage === "nl" ? dutchSources : englishSources), [currentLanguage]);
  const showCategories = preferences.showCategories ?? false; // Default to false if not set

  const fetchNews = useCallback(
    async (forceRefresh = false, page = 1) => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;
      setIsRefreshing(true);

      try {
        const cacheKey = getCacheKey(currentLanguage);
        if (forceRefresh) cache.remove(cacheKey);
        const newsItems = await fetchNewsWithCache(allSources, currentLanguage, page);
        setItems(newsItems);
        setCurrentPage(page);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch news",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        fetchInProgressRef.current = false;
        setIsRefreshing(false);
        setIsInitialLoad(false);
      }
    },
    [currentLanguage, allSources],
  );

  const loadCachedNews = useCallback(() => {
    const cacheKey = getCacheKey(currentLanguage);
    const cachedData = cache.get(cacheKey);
    const cacheTimestamp = cache.get(`${cacheKey}-timestamp`);

    const isCacheValid = checkCacheValidity(cachedData, cacheTimestamp);

    if (isCacheValid) {
      setItems(JSON.parse(cachedData!));
      return true;
    }
    return false;
  }, [currentLanguage]);

  useEffect(() => {
    const hasCachedNews = loadCachedNews();
    setIsLoading(!hasCachedNews);

    // Always perform a full refresh when the extension is launched
    fetchNews(true);
  }, [fetchNews, loadCachedNews]);

  const getTitle = useCallback(() => {
    const sourceName =
      selectedSource || (currentLanguage === "nl" ? TRANSLATIONS.nl.allSources : TRANSLATIONS.en.allSources);
    return currentLanguage === "nl" ? `Nieuwskoppen - ${sourceName}` : `News Headlines - ${sourceName}`;
  }, [selectedSource, currentLanguage]);

  const filteredItems = useMemo(
    () => (selectedSource ? items.filter((item) => item.source === selectedSource) : items),
    [items, selectedSource],
  );

  const paginatedItems = useMemo(
    () => filteredItems.slice(0, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage],
  );

  return (
    <List
      isLoading={isLoading && isInitialLoad}
      searchBarPlaceholder={TRANSLATIONS[currentLanguage].searchPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select News Source"
          storeValue={true}
          onChange={(newValue) =>
            setSelectedSource(newValue === TRANSLATIONS[currentLanguage].latestHeadlines ? null : newValue)
          }
        >
          <List.Dropdown.Item
            title={TRANSLATIONS[currentLanguage].latestHeadlines}
            value={TRANSLATIONS[currentLanguage].latestHeadlines}
          />
          {allSources.map((source) => (
            <List.Dropdown.Item key={source.name} title={source.name} value={source.name} />
          ))}
        </List.Dropdown>
      }
      onSelectionChange={(id) => {
        if (id && parseInt(id, 10) >= paginatedItems.length - 5) {
          // Trigger when 5 items from the end
          fetchNews(false, currentPage + 1);
        }
      }}
    >
      <List.Section title={getTitle()} subtitle={filteredItems.length.toString()}>
        {paginatedItems.map((item, index) => (
          <List.Item
            key={`${item.link}-${index}`}
            title={item.title}
            subtitle={item.source}
            accessories={[
              ...(showCategories && item.category ? [{ tag: { value: item.category, color: Color.Blue } }] : []),
              { text: formatDate(item.pubDate, currentLanguage) },
              ...(isRefreshing && index === 0 ? [{ icon: Icon.Clock }] : []),
            ]}
            icon={{ source: item.favicon }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.link} />
                <Action.CopyToClipboard content={item.link} />
                <Action
                  title={isRefreshing ? "Refreshing…" : "Refresh"}
                  onAction={() => fetchNews(true)}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
