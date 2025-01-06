import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getFavoriteQuotes, toggleFavoriteQuote } from "./utils/storage";
import { QuoteDetail } from "./quote";
import type { Quote } from "./types";

export default function FavoriteQuotes() {
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const quotes = await getFavoriteQuotes();
    setFavorites(quotes);
    setIsLoading(false);
  }

  async function handleToggleFavorite(quote: Quote) {
    await toggleFavoriteQuote(quote);
    await loadFavorites();
  }

  return (
    <List isLoading={isLoading}>
      {favorites.map((quote) => (
        <List.Item
          key={quote.id}
          title={quote.text}
          subtitle={quote.author}
          accessories={[{ icon: Icon.Star }, { text: quote.tags?.join(", ") }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Quote"
                target={<QuoteDetail quote={quote} onToggleFavorite={handleToggleFavorite} isFavorite={true} />}
              />
              <Action
                title="Remove from Favorites"
                icon={Icon.Trash}
                onAction={() => handleToggleFavorite(quote)}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                style={Action.Style.Destructive}
              />
              <Action.CopyToClipboard
                title="Copy Quote"
                content={`"${quote.text}" - ${quote.author}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
