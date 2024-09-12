import { ActionPanel, Action, List, showToast, Toast, Cache, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parser from "rss-parser";

// Initialize constants and global variables
const parser = new Parser();
const cache = new Cache();
const CACHE_KEY = "nl-news-headlines";
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
  },
  en: {
    minute: "minute",
    minutes: "minutes",
    hour: "hour",
    hours: "hours",
    day: "day",
    days: "days",
    ago: "ago",
  },
};

// Helper function to check cache validity
const checkCacheValidity = (
  cachedData: string | undefined,
  cachedLanguage: string | undefined,
  currentLanguage: string,
): boolean => {
  return !!cachedData && cachedLanguage === currentLanguage;
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

// Helper function to get favicon URL
const getFaviconUrl = (url: string): string => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

// Helper function to format date based on language
const formatDate = (dateString: string, language: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS];

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

// Function to fetch news with caching and improved error handling
const fetchNewsWithCache = async (sources: NewsSource[], language: string, page: number): Promise<NewsItem[]> => {
  const cachedData = cache.get(CACHE_KEY);
  const cachedLanguage = cache.get("currentLanguage");

  const itemsMap = new Map<string, NewsItem>();

  if (checkCacheValidity(cachedData, cachedLanguage, language)) {
    JSON.parse(cachedData!).forEach((item: NewsItem) => itemsMap.set(item.link, item));
  }

  const sourcesToFetch = sources.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  await Promise.allSettled(
    sourcesToFetch.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        feed.items.slice(0, MAX_ITEMS_PER_SOURCE).forEach((item: FeedItem) => {
          const newsItem: NewsItem = {
            title: item.title || "",
            link: item.link || "",
            pubDate: parseDate(item.pubDate || item.isoDate || "").toISOString(),
            source: source.name,
            favicon: getFaviconUrl(source.url),
            category: item.categories && typeof item.categories[0] === "string" ? item.categories[0] : undefined,
          };
          itemsMap.set(newsItem.link, newsItem);
        });
      } catch (error) {
        console.error(`Error fetching ${source.name}:`, error);
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch news from ${source.name}`,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
  );

  const sortedItems = Array.from(itemsMap.values())
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, MAX_CACHED_ITEMS);

  cache.set(CACHE_KEY, JSON.stringify(sortedItems));
  cache.set("currentLanguage", language);

  return sortedItems;
};

// Function to get language based on preferences
const getLanguage = (preferenceLanguage: string): string => {
  if (preferenceLanguage === "system") {
    const systemLanguage = getPreferenceValues<{ language: string }>().language.toLowerCase().split("-")[0];
    return systemLanguage === "nl" ? "nl" : "en";
  }
  return preferenceLanguage;
};

// Main component
export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [currentLanguage] = useState<string>(getLanguage(preferences.language));
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);

  const allSources = useMemo(() => (currentLanguage === "nl" ? dutchSources : englishSources), [currentLanguage]);
  const showCategories = preferences.showCategories;

  const fetchNews = useCallback(
    async (forceRefresh = false, page = 1) => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;

      try {
        if (forceRefresh) cache.remove(CACHE_KEY);
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
      }
    },
    [currentLanguage],
  );

  const filteredItems = useMemo(
    () => (selectedSource ? items.filter((item) => item.source === selectedSource) : items),
    [items, selectedSource],
  );

  const paginatedItems = useMemo(
    () => filteredItems.slice(0, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage],
  );

  useEffect(() => {
    const cachedData = cache.get(CACHE_KEY);
    const cachedLanguage = cache.get("currentLanguage");

    if (checkCacheValidity(cachedData, cachedLanguage, currentLanguage)) {
      setItems(JSON.parse(cachedData!));
      setIsLoading(false);
    } else {
      fetchNews(true).then(() => setIsLoading(false));
    }
  }, [currentLanguage, fetchNews]);

  const getTitle = useCallback(() => {
    const sourceName = selectedSource || (currentLanguage === "nl" ? "Alle bronnen" : "All Sources");
    return currentLanguage === "nl" ? `Nieuwskoppen - ${sourceName}` : `News Headlines - ${sourceName}`;
  }, [selectedSource, currentLanguage]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={currentLanguage === "nl" ? "Zoek in nieuwsberichten..." : "Search headlines..."}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select News Source"
          storeValue={true}
          onChange={(newValue) => setSelectedSource(newValue === "Latest Headlines" ? null : newValue)}
        >
          <List.Dropdown.Item title="Latest Headlines" value="Latest Headlines" />
          {allSources.map((source) => (
            <List.Dropdown.Item key={source.name} title={source.name} value={source.name} />
          ))}
        </List.Dropdown>
      }
      onSelectionChange={(id) => {
        if (id && parseInt(id) === paginatedItems.length - 1) fetchNews(false, currentPage + 1);
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
            ]}
            icon={{ source: item.favicon }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.link} />
                <Action.CopyToClipboard content={item.link} />
                <Action title="Refresh" onAction={() => fetchNews(true)} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
