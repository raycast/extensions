import { ActionPanel, Grid, Action, Icon, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

interface Game {
  id: number;
  title: string;
  short_description: string;
  thumbnail: string;
  thumbnail_alt_text?: string;
  type: string;
  categories_featured: string[];
  platforms: Record<string, string>;
  slug: string;
  date_added: string;
  status: string;
  categories: string[];
}

interface GamesResponse {
  games: Game[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

function GameDetailView({ game }: { game: Game }) {
  // Format date to be more readable
  const formattedDate = new Date(game.date_added).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markdown = `
# ${game.title}

![${game.title}](${game.thumbnail})

${game.short_description}
  `;

  // Get categories from either categories or categories_featured
  const categoriesText = game.categories?.join(", ") || game.categories_featured?.join(", ") || "None";

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={game.type} />
          <Detail.Metadata.Label title="Categories" text={categoriesText} />
          <Detail.Metadata.Label title="Added On" text={formattedDate} />

          <Detail.Metadata.Separator />

          {Object.entries(game.platforms).map(([platform, url]) => (
            <Detail.Metadata.Link key={platform} title={platform} target={url} text={platform} />
          ))}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Playtester Link" text={`https://playtester.io/${game.slug}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Playtester" url={`https://playtester.io/${game.slug}`} />
          {Object.entries(game.platforms).map(([platform, url]) => (
            <Action.OpenInBrowser key={platform} title={`Open on ${platform}`} url={url} />
          ))}
        </ActionPanel>
      }
    />
  );
}

// This export is used by Raycast, so the "unused export" warning can be ignored
export default function Command() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        // Helper function to handle HTTP errors without throwing
        async function fetchPage(page: number) {
          const response = await fetch(
            `https://playtester.io/api/games?status=active&sort=date_added&sort_order=desc&page=${page}`,
          );

          if (!response.ok) {
            const errorText = await response.text();
            return {
              success: false,
              error: `HTTP error for page ${page}! Status: ${response.status}, ${errorText}`,
            };
          }

          const data = (await response.json()) as GamesResponse;
          return { success: true, data };
        }

        // Fetch both pages
        const page1Result = await fetchPage(1);
        const page2Result = await fetchPage(2);

        // Check for errors
        if (!page1Result.success && !page2Result.success) {
          // Both pages failed
          setError(page1Result.error || "Unknown error occurred");
          return;
        }

        // Combine successfully fetched data
        const combinedGames: Game[] = [];

        if (page1Result.success && page1Result.data) {
          combinedGames.push(...page1Result.data.games);
        } else if (!page1Result.success) {
          console.error("Error fetching page 1:", page1Result.error);
          await showFailureToast(new Error(page1Result.error), {
            title: "Partially failed to load games",
            message: "Page 1 could not be loaded. Some games might be missing.",
          });
        }

        if (page2Result.success && page2Result.data) {
          combinedGames.push(...page2Result.data.games);
        } else if (!page2Result.success) {
          console.error("Error fetching page 2:", page2Result.error);
          await showFailureToast(new Error(page2Result.error), {
            title: "Partially failed to load games",
            message: "Page 2 could not be loaded. Some games might be missing.",
          });
        }

        setGames(combinedGames);
      } catch (error) {
        console.error("Error fetching games:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        await showFailureToast(error instanceof Error ? error : new Error("An unknown error occurred"), {
          title: "Failed to fetch games",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void fetchGames();
  }, []);

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search games..." fit={Grid.Fit.Fill}>
      {error ? (
        <Grid.EmptyView icon={{ source: Icon.ExclamationMark }} title="Failed to load games" description={error} />
      ) : (
        games.map((game) => (
          <Grid.Item
            key={game.id}
            content={{ source: game.thumbnail, fallback: Icon.Play }}
            title={game.title}
            subtitle={game.categories_featured.join(", ")}
            keywords={[...game.categories_featured, ...(game.categories || [])]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" icon={Icon.Sidebar} target={<GameDetailView game={game} />} />
                <Action.OpenInBrowser title="Open Game Page" url={`https://playtester.io/${game.slug}`} />
                {Object.entries(game.platforms).map(([platform, url]) => (
                  <Action.OpenInBrowser key={platform} title={`Open on ${platform}`} url={url} />
                ))}
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
