import { ActionPanel, List, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

interface Game {
  title: string;
  slug: string;
}

// This export is used by Raycast, the warning can be ignored
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Function to fetch games based on search text
    async function fetchGames() {
      if (searchText === "") {
        // Load trending games if no search query
        setIsLoading(true);
        try {
          const response = await fetch("https://playtester.io/api/games/search");

          if (!response.ok) {
            await showFailureToast(new Error(`HTTP error: ${response.status}`), {
              title: "Error loading trending games",
            });
            setGames([]);
            return;
          }

          const data = (await response.json()) as Game[];
          setGames(data);
        } catch (error) {
          console.error("Error fetching trending games:", error);
          await showFailureToast(error, { title: "Failed to load trending games" });
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
          await showFailureToast(new Error(`HTTP error: ${response.status}`), {
            title: "Error searching games",
          });
          setGames([]);
          return;
        }

        const data = (await response.json()) as Game[];
        setGames(data);
      } catch (error) {
        console.error("Error searching games:", error);
        await showFailureToast(error, { title: "Search failed" });
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
      {!isLoading && games.length === 0 ? (
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
    </List>
  );
}
