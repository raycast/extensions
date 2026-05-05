import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getValidAuthorization } from "./utils/auth";
import { getUserTitles } from "psn-api";
import { Game } from "./types";
import { GameDetail } from "./components/GameDetail";

export default function RecentlyTrophy() {
  const { push } = useNavigation();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentlyTrophy();
  }, []);

  async function loadRecentlyTrophy() {
    let authorization;
    setIsLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Loading trophies...",
    });

    try {
      authorization = await getValidAuthorization();
    } catch (authError) {
      // Auth errors are handled in the auth utility, just log here
      console.error("Authentication failed:", authError);
      setIsLoading(false);
      return;
    }

    try {
      const userTitles = await getUserTitles(authorization, "me");

      const gamesData: Game[] = userTitles.trophyTitles.map((title) => ({
        npCommunicationId: title.npCommunicationId,
        trophyTitleName: title.trophyTitleName,
        trophyTitleIconUrl: title.trophyTitleIconUrl,
        trophyTitlePlatform: title.trophyTitlePlatform,
        hasTrophyGroups: title.hasTrophyGroups,
        definedTrophies: {
          bronze: title.definedTrophies.bronze,
          silver: title.definedTrophies.silver,
          gold: title.definedTrophies.gold,
          platinum: title.definedTrophies.platinum,
        },
        earnedTrophies: {
          bronze: title.earnedTrophies.bronze,
          silver: title.earnedTrophies.silver,
          gold: title.earnedTrophies.gold,
          platinum: title.earnedTrophies.platinum,
        },
        hiddenFlag: title.hiddenFlag,
        progress: title.progress,
        lastUpdatedDateTime: title.lastUpdatedDateTime,
      }));

      setGames(gamesData);

      await showToast({
        style: Toast.Style.Success,
        title: "Trophies loaded",
        message: `Found ${gamesData.length} recent trophies`,
      });
    } catch (error) {
      console.error("Error fetching recent trophies:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch trophies",
        message: "Unable to retrieve your recent trophies. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // If not loading and no games, show empty state using List
  if (!isLoading && games.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.GameController} title="No Recent Trophies" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search games...">
      {games.map((game) => (
        <List.Item
          key={game.npCommunicationId}
          icon={game.trophyTitleIconUrl}
          title={game.trophyTitleName}
          accessories={[
            { text: `${game.earnedTrophies.platinum}`, icon: "platinum.png" },
            { text: `${game.earnedTrophies.gold}`, icon: "gold.png" },
            { text: `${game.earnedTrophies.silver}`, icon: "silver.png" },
            { text: `${game.earnedTrophies.bronze}`, icon: "bronze.png" },
          ]}
          actions={
            <ActionPanel>
              <Action title="View Game Details" icon={Icon.Eye} onAction={() => push(<GameDetail game={game} />)} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadRecentlyTrophy}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
