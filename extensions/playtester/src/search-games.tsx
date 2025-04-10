import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface Game {
  title: string;
  slug: string;
}

// This export is used by Raycast, the warning can be ignored
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Function to fetch games based on search text
    async function fetchGames() {
      if (searchText === "") {
        // Load trending games if no search query
        setIsLoading(true);
        try {
          const response = await fetch("https://playtester.io/api/games/search");

          if (!response.ok) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Error loading trending games",
              message: `HTTP error: ${response.status}`,
            });
            setGames([]);
            return;
          }

          const data = (await response.json()) as Game[];
          setGames(data);
        } catch (error) {
          console.error("Error fetching trending games:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load trending games",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          setGames([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Don't search until we have at least 2 characters
      if (searchText.length < 2) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`https://playtester.io/api/games/search?q=${encodeURIComponent(searchText)}`);

        if (!response.ok) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error searching games",
            message: `HTTP error: ${response.status}`,
          });
          setGames([]);
          return;
        }

        const data = (await response.json()) as Game[];
        setGames(data);
      } catch (error) {
        console.error("Error searching games:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setGames([]);
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce search to avoid too many requests
    const handler = setTimeout(() => {
      void fetchGames();
    }, 300);

    return () => clearTimeout(handler);
  }, [searchText]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search games..." throttle>
      <List.Section title={searchText ? "Search Results" : "Trending Games"}>
        {games.length === 0 ? (
          <List.EmptyView
            title={searchText ? "No games found" : "No trending games available"}
            description={searchText ? "Try a different search term" : "Check back later for trending games"}
          />
        ) : (
          games.map((game) => (
            <List.Item
              key={game.slug}
              title={game.title}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="View on Playtester" url={`https://playtester.io/${game.slug}`} />
                  <Action.CopyToClipboard title="Copy URL" content={`https://playtester.io/${game.slug}`} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
