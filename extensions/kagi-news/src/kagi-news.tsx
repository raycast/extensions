import { List, Detail, Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";

interface Preferences {
  language: string;
}

interface Category {
  name: string;
  file: string;
}

interface Source {
  name: string;
  url: string;
}

interface ClusterArticle {
  title: string;
  link: string;
}

interface Cluster {
  cluster_number: number;
  title: string;
  short_summary: string;
  articles: ClusterArticle[];
  talking_points?: string[];
  did_you_know?: string;
  emoji?: string;
  category: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  sources: Source[];
  highlights?: string[];
  didYouKnow?: string;
  emoji?: string;
  category: string;
}

interface CategoryResponse {
  category: string;
  timestamp: number;
  clusters: Cluster[];
}

interface HistoricalEvent {
  year: string;
  content: string;
  type: string;
  sort_year: number;
}

interface OnThisDayResponse {
  timestamp: number;
  events: HistoricalEvent[];
}

interface KiteResponse {
  categories: Category[];
  timestamp?: number;
}

const CATEGORIES_URL = "https://kite.kagi.com/kite.json";
const NEWS_BASE_URL = "https://news.kagi.com";

function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return url;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function clustersToArticles(clusters: Cluster[]): Article[] {
  return clusters.map((cluster) => {
    const sources: Source[] =
      cluster.articles?.map((article) => ({
        name: article.title.length > 50 ? article.title.substring(0, 50) + "..." : article.title,
        url: article.link,
      })) || [];

    const uniqueSources = sources.filter(
      (source, index, self) => index === self.findIndex((s) => s.url === source.url),
    );

    return {
      id: `cluster-${cluster.cluster_number}`,
      title: cluster.title,
      summary: cluster.short_summary,
      sources: uniqueSources,
      highlights: cluster.talking_points || [],
      didYouKnow: cluster.did_you_know,
      emoji: cluster.emoji,
      category: cluster.category,
    };
  });
}

function useCategoryFeed(categoryFile: string, language: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnThisDay, setIsOnThisDay] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const suffix = language === "default" ? "" : `_${language}`;
    const fileName = categoryFile.replace(".json", `${suffix}.json`);
    const url = `${NEWS_BASE_URL}/${fileName}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (categoryFile === "onthisday.json") {
          setIsOnThisDay(true);
          const allEvents = (data as OnThisDayResponse).events || [];

          const eventsList = allEvents.filter((e) => e.type === "event").sort((a, b) => a.sort_year - b.sort_year);
          const peopleList = allEvents.filter((e) => e.type === "people").sort((a, b) => a.sort_year - b.sort_year);

          setEvents([...eventsList, ...peopleList]);
          setArticles([]);
        } else {
          setIsOnThisDay(false);
          const parsedArticles = clustersToArticles((data as CategoryResponse).clusters || []);
          setArticles(parsedArticles);
          setEvents([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load content");
        setArticles([]);
        setEvents([]);
        setIsLoading(false);
      });
  }, [categoryFile, language]);

  return { articles, events, isLoading, error, isOnThisDay };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("selected-category", "world.json");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    fetch(CATEGORIES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load categories");
        }
        return response.json();
      })
      .then((data: KiteResponse) => {
        setCategories(data.categories || []);
        setLoadingCategories(false);
      })
      .catch((err) => {
        setCategoriesError(err.message || "Failed to load categories");
        setLoadingCategories(false);
      });
  }, []);

  const {
    articles,
    events,
    isLoading: loadingContent,
    error: contentError,
    isOnThisDay,
  } = useCategoryFeed(selectedCategory, preferences.language);

  if (selectedEvent) {
    const markdown = `# ${selectedEvent.year}\n\n${stripHtml(selectedEvent.content)}`;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={selectedEvent.type} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Back to Events" icon={Icon.ArrowLeft} onAction={() => setSelectedEvent(null)} />
          </ActionPanel>
        }
      />
    );
  }

  if (selectedArticle) {
    const sources = selectedArticle.sources || [];
    const highlights = selectedArticle.highlights || [];

    let markdown = `# ${selectedArticle.title}\n\n## Summary\n${selectedArticle.summary}`;

    if (highlights.length > 0) {
      markdown += `\n\n## Talking Points\n`;
      highlights.forEach((highlight) => {
        markdown += `- ${highlight}\n`;
      });
    }

    if (selectedArticle.didYouKnow) {
      markdown += `\n\n## Did You Know?\n${selectedArticle.didYouKnow}`;
    }

    const allText = [selectedArticle.summary, ...(highlights || []), selectedArticle.didYouKnow || ""].join(" ");
    const refRegex = /\[([a-z0-9.-]+)#(\d+)\]/g;
    const referencedSources = new Map<string, Source>();

    let match;
    while ((match = refRegex.exec(allText)) !== null) {
      const domain = match[1];
      const num = parseInt(match[2], 10);
      const key = `${domain}#${num}`;

      const source = sources.find((s) => getDomain(s.url) === domain);
      if (source && !referencedSources.has(key)) {
        referencedSources.set(key, source);
      }
    }

    return (
      <Detail
        markdown={markdown}
        metadata={
          referencedSources.size > 0 ? (
            <Detail.Metadata>
              {Array.from(referencedSources.entries()).map(([key, source], index) => (
                <Detail.Metadata.Link key={index} title={`[${key}]`} target={source.url} text={source.name} />
              ))}
            </Detail.Metadata>
          ) : undefined
        }
        actions={
          <ActionPanel>
            <Action title="Back to Articles" icon={Icon.ArrowLeft} onAction={() => setSelectedArticle(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loadingCategories || loadingContent}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          {categories.map((category) => (
            <List.Dropdown.Item key={category.file} title={category.name} value={category.file} />
          ))}
        </List.Dropdown>
      }
    >
      {categoriesError ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Load Categories" description={categoriesError} />
      ) : contentError ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Load Content" description={contentError} />
      ) : isOnThisDay ? (
        events.length === 0 && !loadingContent ? (
          <List.EmptyView icon={Icon.Calendar} title="No Events Found" />
        ) : (
          <>
            <List.Section title="Events">
              {events
                .filter((e) => e.type === "event")
                .map((event, idx) => (
                  <List.Item
                    key={idx}
                    icon="📅"
                    title={`${event.year} - ${stripHtml(event.content).substring(0, 80)}...`}
                    actions={
                      <ActionPanel>
                        <Action title="View Event" icon={Icon.Eye} onAction={() => setSelectedEvent(event)} />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
            <List.Section title="People">
              {events
                .filter((e) => e.type === "people")
                .map((event, idx) => (
                  <List.Item
                    key={idx}
                    icon="👤"
                    title={`${event.year} - ${stripHtml(event.content).substring(0, 80)}...`}
                    actions={
                      <ActionPanel>
                        <Action title="View Event" icon={Icon.Eye} onAction={() => setSelectedEvent(event)} />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          </>
        )
      ) : articles.length === 0 && !loadingContent ? (
        <List.EmptyView icon={Icon.Document} title="No Articles Found" />
      ) : (
        articles.map((article) => (
          <List.Item
            key={article.id}
            icon={article.emoji || "📰"}
            title={article.title}
            accessories={[{ tag: article.category }]}
            actions={
              <ActionPanel>
                <Action title="View Article" icon={Icon.Eye} onAction={() => setSelectedArticle(article)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
