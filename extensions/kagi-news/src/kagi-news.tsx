import { List, Detail, Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { Article, HistoricalEvent, Source } from "./interfaces";
import { useCategoryFeed } from "./hooks/useCategoryFeed";
import { useCategories } from "./hooks/useCategories";
import { getDomain, stripHtml } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("selected-category", "world.json");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  const { categories, isLoading: loadingCategories, error: categoriesError } = useCategories();

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
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Categories"
          description={categoriesError instanceof Error ? categoriesError.message : String(categoriesError)}
        />
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
