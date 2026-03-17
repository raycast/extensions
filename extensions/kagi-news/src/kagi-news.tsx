// kagi-news.tsx
// Daily News command - browse today's categories and articles with favorites

import { List, Action, ActionPanel, Icon, getPreferenceValues, Color } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCategoryFeed } from "./hooks/useCategoryFeed";
import { useCategories } from "./hooks/useCategories";
import { useFavoriteCategories } from "./hooks/useFavoriteCategories";
import { stripHtml } from "./utils";
import { ArticleDetail } from "./views/ArticleDetail";
import { EventDetail } from "./views/EventDetail";
import { ChaosIndexDetail } from "./views/ChaosIndexDetail";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("selected-category", "");

  const { categories, isLoading: loadingCategories, error: categoriesError } = useCategories();
  const { isFavorite, toggleFavorite } = useFavoriteCategories();

  const {
    articles,
    events,
    chaosIndex,
    isLoading: loadingContent,
    error: contentError,
    isOnThisDay,
    isChaosIndex,
  } = useCategoryFeed(selectedCategory, preferences.language);

  // Sort categories: favorites first (alphabetically), then others (alphabetically)
  const sortedCategories = [
    ...categories.filter((cat) => isFavorite(cat.id)).sort((a, b) => a.name.localeCompare(b.name)),
    ...categories.filter((cat) => !isFavorite(cat.id)).sort((a, b) => a.name.localeCompare(b.name)),
  ];

  // Get current category for action
  const currentCategory = categories.find((cat) => cat.id === selectedCategory);

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
              key={category.id}
              title={category.name}
              icon={isFavorite(category.id) ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled}
              value={category.id}
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
                {currentCategory && (
                  <Action
                    title={isFavorite(currentCategory.id) ? "Remove from Favorites" : "Add to Favorites"}
                    icon={
                      isFavorite(currentCategory.id)
                        ? Icon.StarDisabled
                        : { source: Icon.Star, tintColor: Color.Yellow }
                    }
                    onAction={() => toggleFavorite(currentCategory.id)}
                  />
                )}
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
                        {currentCategory && (
                          <Action
                            title={isFavorite(currentCategory.id) ? "Remove from Favorites" : "Add to Favorites"}
                            icon={
                              isFavorite(currentCategory.id)
                                ? Icon.StarDisabled
                                : { source: Icon.Star, tintColor: Color.Yellow }
                            }
                            onAction={() => toggleFavorite(currentCategory.id)}
                          />
                        )}
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
                        {currentCategory && (
                          <Action
                            title={isFavorite(currentCategory.id) ? "Remove from Favorites" : "Add to Favorites"}
                            icon={
                              isFavorite(currentCategory.id)
                                ? Icon.StarDisabled
                                : { source: Icon.Star, tintColor: Color.Yellow }
                            }
                            onAction={() => toggleFavorite(currentCategory.id)}
                          />
                        )}
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
                {currentCategory && (
                  <Action
                    title={isFavorite(currentCategory.id) ? "Remove from Favorites" : "Add to Favorites"}
                    icon={
                      isFavorite(currentCategory.id)
                        ? Icon.StarDisabled
                        : { source: Icon.Star, tintColor: Color.Yellow }
                    }
                    onAction={() => toggleFavorite(currentCategory.id)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
