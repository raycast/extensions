import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CardDetail } from "./components/CardDetail";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import {
  getUserFacingErrorMessage,
  type RaycastCard,
  searchCards,
} from "./lib/api";
import { TEAK_APP_URL } from "./lib/constants";
import { formatDate } from "./lib/dateFormat";
import { getPreferences } from "./lib/preferences";

export default function SearchCardsCommand() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RaycastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { apiKey } = getPreferences();
  const hasApiKey = Boolean(apiKey?.trim());

  const loadCards = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchCards(searchQuery, 50);
      setItems(response.items);
    } catch (requestError) {
      setError(getUserFacingErrorMessage(requestError));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasApiKey) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void loadCards(query);
  }, [query, hasApiKey, loadCards]);

  if (!hasApiKey) {
    return <MissingApiKeyDetail />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Teak Cards"
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Teak cards"
      throttle
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  void loadCards(query);
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
        const targetUrl = card.url || TEAK_APP_URL;

        return (
          <List.Item
            accessories={[
              { text: formatDate(card.createdAt) },
              { tag: card.type },
            ]}
            actions={
              <ActionPanel>
                {card.url ? (
                  <Action.OpenInBrowser title="Open URL" url={targetUrl} />
                ) : null}
                <Action.Push
                  target={<CardDetail card={card} />}
                  title="View Details"
                />
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
            icon={card.isFavorited ? Icon.Star : Icon.Document}
            key={card.id}
            subtitle={subtitle}
            title={title}
          />
        );
      })}
      {!(isLoading || error) && items.length === 0 ? (
        <List.EmptyView
          description="Try a different keyword, tag, or phrase."
          icon={Icon.MagnifyingGlass}
          title="No cards found"
        />
      ) : null}
    </List>
  );
}
