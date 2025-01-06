import { List, Action, ActionPanel, Icon, useNavigation, Detail, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { STOIC_QUOTES } from "./data/quotes";
import type { Quote } from "./types";
import { toggleFavoriteQuote, getFavoriteQuotes } from "./utils/storage";

export function QuoteDetail({
  quote,
  onToggleFavorite,
  isFavorite,
}: {
  quote: Quote;
  onToggleFavorite: (quote: Quote) => void;
  isFavorite: boolean;
}) {
  const [isCurrentlyFavorite, setIsCurrentlyFavorite] = useState(isFavorite);

  const handleFavoriteToggle = async () => {
    await onToggleFavorite(quote);
    setIsCurrentlyFavorite(!isCurrentlyFavorite);
  };

  return (
    <Detail
      markdown={`# "${quote.text}"
      
*- ${quote.author}*`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={quote.author} />
          {quote.tags && (
            <Detail.Metadata.TagList title="Themes">
              {quote.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={"#FF6363"} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={isCurrentlyFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isCurrentlyFavorite ? Icon.Trash : Icon.Star}
              onAction={handleFavoriteToggle}
              shortcut={{ modifiers: ["cmd"], key: isCurrentlyFavorite ? "backspace" : "s" }}
              style={isCurrentlyFavorite ? Action.Style.Destructive : undefined}
            />
            <Action.CopyToClipboard
              title="Copy Quote"
              content={`"${quote.text}" - ${quote.author}`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
export default function Command() {
  const [quote, setQuote] = useState<Quote>(STOIC_QUOTES[0]);
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadFavorites();
    getRandomQuote();
  }, []);

  const getRandomQuote = async () => {
    const randomIndex = Math.floor(Math.random() * STOIC_QUOTES.length);
    setQuote(STOIC_QUOTES[randomIndex]);
    await showToast({
      style: Toast.Style.Success,
      title: "New Quote Generated",
      message: "Wisdom refreshed",
    });
  };

  async function loadFavorites() {
    const loadedFavorites = await getFavoriteQuotes();
    setFavorites(loadedFavorites);
    setIsLoading(false);
  }

  async function handleToggleFavorite(quote: Quote) {
    try {
      const isFavorited = await toggleFavoriteQuote(quote);
      await loadFavorites();
      await showToast({
        style: Toast.Style.Success,
        title: isFavorited ? "Added to Favorites" : "Removed from Favorites",
        message: isFavorited
          ? "Quote added to your collection"
          : "Quote removed from your collection. Press ⌘+S to add it back.",
        primaryAction: isFavorited
          ? undefined
          : {
              title: "Undo",
              onAction: async () => {
                await toggleFavoriteQuote(quote);
                await loadFavorites();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Quote Restored",
                  message: "Added back to your favorites",
                });
              },
            },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Favorites",
        message: String(error),
      });
    }
  }

  const isFavorite = (quote: Quote) => favorites.some((fav) => fav.id === quote.id);

  const handleCopyToClipboard = () => {
    showToast({
      style: Toast.Style.Success,
      title: "Quote Copied",
      message: "Ready to share wisdom",
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Author"
          storeValue={true}
          onChange={(author) => {
            if (author === "all") {
              getRandomQuote();
            } else {
              const authorQuotes = STOIC_QUOTES.filter((q) => q.author === author);
              setQuote(authorQuotes[Math.floor(Math.random() * authorQuotes.length)]);
            }
          }}
        >
          <List.Dropdown.Item title="All Authors" value="all" />
          {Array.from(new Set(STOIC_QUOTES.map((q) => q.author))).map((author) => (
            <List.Dropdown.Item key={author} title={author} value={author} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Item
        title={quote.text}
        subtitle={quote.author}
        accessories={[
          {
            icon: isFavorite(quote) ? Icon.Star : undefined,
            tooltip: isFavorite(quote) ? "Favorited" : undefined,
          },
          {
            text: quote.tags?.join(", "),
            tooltip: "Themes",
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="View Quote"
                icon={Icon.Eye}
                onAction={() =>
                  push(
                    <QuoteDetail
                      quote={quote}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={isFavorite(quote)}
                    />,
                  )
                }
              />
              <Action
                title="New Quote"
                icon={Icon.Repeat}
                onAction={getRandomQuote}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title={isFavorite(quote) ? "Remove from Favorites" : "Add to Favorites"}
                icon={isFavorite(quote) ? Icon.StarDisabled : Icon.Star}
                onAction={() => handleToggleFavorite(quote)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action.CopyToClipboard
                title="Copy Quote"
                content={`"${quote.text}" - ${quote.author}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onCopy={handleCopyToClipboard}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((favorite) => (
            <List.Item
              key={favorite.id}
              title={favorite.text}
              subtitle={favorite.author}
              accessories={[{ icon: Icon.Star }, { text: favorite.tags?.join(", ") }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Quote"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(<QuoteDetail quote={favorite} onToggleFavorite={handleToggleFavorite} isFavorite={true} />)
                    }
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => handleToggleFavorite(favorite)}
                  />
                  <Action.CopyToClipboard title="Copy Quote" content={`"${favorite.text}" - ${favorite.author}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
