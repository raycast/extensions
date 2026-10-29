// kagi-news.tsx
// Daily News command - browse today's categories and articles with favorites

import { List, Action, ActionPanel, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { useCategoryFeed } from "./hooks/useCategoryFeed";
import { useCategories } from "./hooks/useCategories";
import { useFavoriteCategories } from "./hooks/useFavoriteCategories";
import { stripHtml } from "./utils";
import { ArticleDetail } from "./views/ArticleDetail";
import { EventDetail } from "./views/EventDetail";
import { ChaosIndexDetail } from "./views/ChaosIndexDetail";
import { FavoritesAction } from "./components/FavoritesAction";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  // Persisted across days as the stable categoryId slug (e.g. "world"), never the per-batch id
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("selected-category", "");

  const { categories, isLoading: loadingCategories, error: categoriesError } = useCategories();
  const { isFavorite } = useFavoriteCategories();

  // Resolve the persisted slug to this batch's actual category (and its per-batch id)
  const currentCategory = categories.find((cat) => cat.categoryId === selectedCategory);

  // Fall back to World (or the first category) if the persisted selection doesn't match any
  // category today - e.g. right after upgrading from a version that cached a different kind of
  // identifier, or if a previously selected category simply isn't in today's batch.
  useEffect(() => {
    if (!loadingCategories && categories.length > 0 && !currentCategory) {
      const fallback = categories.find((cat) => cat.categoryId === "world") || categories[0];
      setSelectedCategory(fallback.categoryId);
    }
  }, [loadingCategories, categories, currentCategory, setSelectedCategory]);

  const {
    articles,
    events,
    chaosIndex,
    isLoading: loadingContent,
    error: contentError,
    isOnThisDay,
    isChaosIndex,
  } = useCategoryFeed(currentCategory?.id ?? "", preferences.language);

  // Sort categories: favorites first (alphabetically), then others (alphabetically)
  const sortedCategories = [
    ...categories.filter((cat) => isFavorite(cat.categoryId)).sort((a, b) => a.name.localeCompare(b.name)),
    ...categories.filter((cat) => !isFavorite(cat.categoryId)).sort((a, b) => a.name.localeCompare(b.name)),
  ];

  return (
    <List
      isLoading={loadingCategories || loadingContent}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          {sortedCategories.map((category) => (
            <List.Dropdown.Item
              key={category.categoryId}
              title={category.name}
              icon={
                isFavorite(category.categoryId) ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled
              }
              value={category.categoryId}
            />
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
      ) : isChaosIndex ? (
        chaosIndex ? (
          <List.Item
            key="chaos-index"
            icon="🌍"
            title="Global Chaos Index"
            subtitle={`Score: ${chaosIndex.score}/100`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<ChaosIndexDetail score={chaosIndex.score} description={chaosIndex.description} />}
                />
                <FavoritesAction category={currentCategory} />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView icon={Icon.ExclamationMark} title="No Chaos Index Data" />
        )
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
                        <Action.Push title="View Event" icon={Icon.Eye} target={<EventDetail event={event} />} />
                        <FavoritesAction category={currentCategory} />
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
                        <Action.Push title="View Event" icon={Icon.Eye} target={<EventDetail event={event} />} />
                        <FavoritesAction category={currentCategory} />
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
                <Action.Push title="View Article" icon={Icon.Eye} target={<ArticleDetail article={article} />} />
                <FavoritesAction category={currentCategory} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
