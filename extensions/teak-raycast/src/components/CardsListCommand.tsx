import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getUserFacingErrorMessage, type RaycastCard } from "../lib/api";
import { getOpenableUrl } from "../lib/cardDetailModel";
import { removeCardById, toTagQuery, upsertCard } from "../lib/cardListState";
import { TEAK_APP_URL } from "../lib/constants";
import { formatDate } from "../lib/dateFormat";
import { getPreferences } from "../lib/preferences";
import { CardDetail } from "./CardDetail";
import { MissingApiKeyDetail } from "./MissingApiKeyDetail";
import { SetApiKeyAction } from "./SetApiKeyAction";

type CardsListCommandProps = {
  emptyDescription: string;
  emptyIcon: Icon;
  emptyTitle: string;
  getItemIcon?: (card: RaycastCard) => Icon;
  loadCards: (searchQuery: string) => Promise<{ items: RaycastCard[] }>;
  navigationTitle: string;
  removeUnfavoritedFromList?: boolean;
  searchBarPlaceholder: string;
};

export function CardsListCommand({
  emptyDescription,
  emptyIcon,
  emptyTitle,
  getItemIcon,
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

  const load = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await loadCards(searchQuery);
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

    void load(query);
  }, [hasApiKey, load, query]);

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
    setQuery(toTagQuery(tag));
  }, []);

  const handleNavigateBackAfterDelete = useCallback(() => {
    setError(null);
  }, []);

  if (!hasApiKey) {
    return <MissingApiKeyDetail />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
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
                  void load(query);
                }}
                title="Retry"
              />
              <SetApiKeyAction />
            </ActionPanel>
          }
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {items.map((card) => {
        const title =
          card.metadataTitle || card.content.slice(0, 70) || "Untitled";
        const subtitle =
          card.url || card.metadataDescription || card.notes || "";
        const openableUrl = getOpenableUrl(card);

        return (
          <List.Item
            accessories={[
              { text: formatDate(card.createdAt) },
              { tag: card.type },
            ]}
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
                      onNavigateBackAfterDelete={handleNavigateBackAfterDelete}
                    />
                  }
                  title="View Card"
                />
                {openableUrl ? (
                  <Action.OpenInBrowser title="Open URL" url={openableUrl} />
                ) : null}
                <Action.CopyToClipboard
                  content={card.content}
                  title="Copy Content"
                />
                {card.url ? (
                  <Action.CopyToClipboard content={card.url} title="Copy URL" />
                ) : null}
                <Action
                  icon={Icon.House}
                  onAction={() => open(TEAK_APP_URL)}
                  title="Open Teak App"
                />
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
      {!(isLoading || error) && items.length === 0 ? (
        <List.EmptyView
          description={emptyDescription}
          icon={emptyIcon}
          title={emptyTitle}
        />
      ) : null}
    </List>
  );
}
