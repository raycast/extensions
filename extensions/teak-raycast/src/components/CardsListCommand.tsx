import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CardSearchInput,
  getUserFacingErrorMessage,
  type RaycastCard,
  setCardFavorite,
} from "../lib/api";
import {
  getCardDomain,
  getCardTitle,
  getOpenableUrl,
  getTeakUrl,
} from "../lib/cardDetailModel";
import { removeCardById, upsertCard } from "../lib/cardListState";
import { getPreferences } from "../lib/preferences";
import {
  applyFavoritedFilter,
  applySortFilter,
  applyTagFilter,
  applyTypeFilter,
  clearSearchFilters,
  parseSearchFilters,
  type RaycastCardType,
} from "../lib/searchFilters";
import { CardDetail } from "./CardDetail";
import { EditCardForm } from "./EditCardForm";
import { MissingApiKeyDetail } from "./MissingApiKeyDetail";
import { SetApiKeyAction } from "./SetApiKeyAction";

type CardsListCommandProps = {
  emptyDescription: string;
  emptyIcon: Icon;
  emptyTitle: string;
  getItemIcon?: (card: RaycastCard) => Icon;
  latestSectionTitle: string;
  loadCards: (input: CardSearchInput) => Promise<{ items: RaycastCard[] }>;
  navigationTitle: string;
  removeUnfavoritedFromList?: boolean;
  searchBarPlaceholder: string;
};

const TYPE_OPTIONS: Array<{ title: string; value?: RaycastCardType }> = [
  { title: "All Types" },
  { title: "Text", value: "text" },
  { title: "Links", value: "link" },
  { title: "Images", value: "image" },
  { title: "Videos", value: "video" },
  { title: "Audio", value: "audio" },
  { title: "Documents", value: "document" },
  { title: "Palettes", value: "palette" },
  { title: "Quotes", value: "quote" },
];

const getCardSubtitle = (card: RaycastCard): string => {
  const domain = getCardDomain(card);
  if (card.type === "link") {
    return domain || card.metadataDescription || card.notes || card.url || "";
  }

  return card.notes || card.metadataDescription || card.url || domain || "";
};

const getCardAccessories = (card: RaycastCard): List.Item.Accessory[] => {
  const accessories: List.Item.Accessory[] = [];

  if (card.tags[0]) {
    accessories.push({
      tag: {
        color: Color.Blue,
        value: card.tags[0],
      },
      tooltip: "First tag",
    });
  }

  if (card.isFavorited) {
    accessories.push({
      tag: {
        color: Color.Yellow,
        value: "Fav",
      },
      tooltip: "Favorited",
    });
  }

  accessories.push({
    date: new Date(card.createdAt),
    tooltip: "Created at",
  });

  return accessories;
};

export function CardsListCommand({
  emptyDescription,
  emptyIcon,
  emptyTitle,
  getItemIcon,
  latestSectionTitle,
  loadCards,
  navigationTitle,
  removeUnfavoritedFromList = false,
  searchBarPlaceholder,
}: CardsListCommandProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RaycastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { apiKey } = getPreferences();
  const hasApiKey = Boolean(apiKey?.trim());

  const parsedFilters = useMemo(() => parseSearchFilters(query), [query]);
  const requestInput = useMemo<CardSearchInput>(
    () => ({
      favorited:
        removeUnfavoritedFromList || parsedFilters.favorited ? true : undefined,
      limit: 50,
      query: parsedFilters.query,
      sort: parsedFilters.sort,
      tag: parsedFilters.tag,
      type: parsedFilters.type,
    }),
    [parsedFilters, removeUnfavoritedFromList],
  );

  const load = useCallback(
    async (input: CardSearchInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await loadCards(input);
        setItems(response.items);
      } catch (requestError) {
        const message = getUserFacingErrorMessage(requestError);
        setError(message);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [loadCards],
  );

  useEffect(() => {
    if (!hasApiKey) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void load(requestInput);
  }, [hasApiKey, load, requestInput]);

  const handleCardUpdated = useCallback(
    (next: RaycastCard) => {
      setItems((previous) =>
        upsertCard(previous, next, {
          removeWhenUnfavorited: removeUnfavoritedFromList,
        }),
      );
    },
    [removeUnfavoritedFromList],
  );

  const handleCardDeleted = useCallback((cardId: string) => {
    setItems((previous) => removeCardById(previous, cardId).cards);
  }, []);

  const handleFilterByTag = useCallback((tag: string) => {
    setQuery((previous) => applyTagFilter(previous, tag));
  }, []);

  const handleNavigateBackAfterDelete = useCallback(() => {
    setError(null);
  }, []);

  const handleToggleFavorite = useCallback(
    async (card: RaycastCard) => {
      const previousState = card.isFavorited;
      const optimisticCard = {
        ...card,
        isFavorited: !previousState,
      };

      handleCardUpdated(optimisticCard);

      try {
        const updated = await setCardFavorite(card.id, !previousState);
        handleCardUpdated(updated);
      } catch {
        handleCardUpdated(card);
      }
    },
    [handleCardUpdated],
  );

  if (!hasApiKey) {
    return <MissingApiKeyDetail />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        parsedFilters.rawQuery.trim() ? navigationTitle : latestSectionTitle
      }
      onSearchTextChange={setQuery}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={query}
      throttle
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  void load(requestInput);
                }}
                title="Retry"
              />
              {parsedFilters.hasExplicitFilters ? (
                <Action
                  icon={Icon.XMarkCircle}
                  onAction={() => {
                    setQuery((previous) => clearSearchFilters(previous));
                  }}
                  title="Clear Filters"
                />
              ) : null}
              <SetApiKeyAction />
            </ActionPanel>
          }
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}

      <List.Section>
        {items.map((card) => {
          const title = getCardTitle(card);
          const subtitle = getCardSubtitle(card);
          const openableUrl = getOpenableUrl(card);
          const tagOptions = [...card.tags, ...card.aiTags].slice(0, 8);

          return (
            <List.Item
              accessories={getCardAccessories(card)}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Eye}
                    target={
                      <CardDetail
                        card={card}
                        onCardDeleted={handleCardDeleted}
                        onCardUpdated={handleCardUpdated}
                        onFilterByTag={handleFilterByTag}
                        onNavigateBackAfterDelete={
                          handleNavigateBackAfterDelete
                        }
                      />
                    }
                    title="View Card"
                  />
                  {openableUrl ? (
                    <Action.OpenInBrowser title="Open URL" url={openableUrl} />
                  ) : null}
                  <Action.OpenInBrowser
                    title="Open in Teak"
                    url={getTeakUrl(card)}
                  />
                  <Action
                    icon={Icon.Star}
                    onAction={() => {
                      void handleToggleFavorite(card);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    title={
                      card.isFavorited ? "Remove Favorite" : "Add Favorite"
                    }
                  />
                  <Action.Push
                    icon={Icon.Pencil}
                    target={
                      <EditCardForm
                        card={card}
                        onCardUpdated={handleCardUpdated}
                      />
                    }
                    title="Edit Tags & Notes"
                  />
                  <ActionPanel.Section title="Filters">
                    {removeUnfavoritedFromList ? null : (
                      <Action
                        icon={Icon.Star}
                        onAction={() => {
                          setQuery((previous) =>
                            applyFavoritedFilter(
                              previous,
                              parsedFilters.favorited ? undefined : true,
                            ),
                          );
                        }}
                        title={
                          parsedFilters.favorited
                            ? "Show All Cards"
                            : "Show Favorites Only"
                        }
                      />
                    )}
                    <ActionPanel.Submenu
                      icon={Icon.List}
                      title="Filter by Type"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <Action
                          key={option.title}
                          onAction={() => {
                            setQuery((previous) =>
                              applyTypeFilter(previous, option.value),
                            );
                          }}
                          title={option.title}
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <ActionPanel.Submenu
                      icon={Icon.ArrowUp}
                      title="Sort Results"
                    >
                      <Action
                        onAction={() => {
                          setQuery((previous) =>
                            applySortFilter(previous, "newest"),
                          );
                        }}
                        title="Newest First"
                      />
                      <Action
                        onAction={() => {
                          setQuery((previous) =>
                            applySortFilter(previous, "oldest"),
                          );
                        }}
                        title="Oldest First"
                      />
                    </ActionPanel.Submenu>
                    {tagOptions.length > 0 ? (
                      <ActionPanel.Submenu
                        icon={Icon.Tag}
                        title="Filter by Tag"
                      >
                        {tagOptions.map((tag) => (
                          <Action
                            key={tag}
                            onAction={() => {
                              setQuery((previous) =>
                                applyTagFilter(previous, tag),
                              );
                            }}
                            title={tag}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    ) : null}
                    {parsedFilters.hasExplicitFilters ? (
                      <Action
                        icon={Icon.XMarkCircle}
                        onAction={() => {
                          setQuery((previous) => clearSearchFilters(previous));
                        }}
                        title="Clear Filters"
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      content={card.content}
                      title="Copy Content"
                    />
                    {card.url ? (
                      <Action.CopyToClipboard
                        content={card.url}
                        title="Copy URL"
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <SetApiKeyAction />
                </ActionPanel>
              }
              icon={getItemIcon ? getItemIcon(card) : Icon.Document}
              key={card.id}
              subtitle={subtitle}
              title={title}
            />
          );
        })}
      </List.Section>

      {!(isLoading || error) && items.length === 0 ? (
        <List.EmptyView
          description={
            parsedFilters.rawQuery.trim()
              ? "Try a different keyword or clear your filters."
              : emptyDescription
          }
          icon={emptyIcon}
          title={
            parsedFilters.rawQuery.trim() ? "No matching cards" : emptyTitle
          }
        />
      ) : null}
    </List>
  );
}
