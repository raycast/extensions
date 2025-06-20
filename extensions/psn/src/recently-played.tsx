import { Grid, List, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getUserTitles } from "psn-api";
import { getValidAuthorization } from "./utils/auth";
import { Game } from "./types";
import { GameDetail } from "./components/GameDetail";

export default function RecentlyPlayed() {
  const { push } = useNavigation();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentlyPlayedGames();
  }, []);

  async function loadRecentlyPlayedGames() {
    let authorization;
    setIsLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Loading games...",
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
        title: "Games loaded",
        message: `Found ${gamesData.length} recent played games`,
      });
    } catch (profileError) {
      console.error("Error fetching recent played games:", profileError);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch games",
        message: "Unable to retrieve your recent played games. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // If not loading and no games, show empty state using List
  if (!isLoading && games.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.GameController} title="No Recent Games" />
      </List>
    );
  }

  return (
    <Grid columns={5} isLoading={isLoading}>
      {games.map((game) => {
        return (
          <Grid.Item
            key={game.npCommunicationId}
            content={game.trophyTitleIconUrl || Icon.GameController}
            actions={
              <ActionPanel>
                <Action title="View Game Details" icon={Icon.Eye} onAction={() => push(<GameDetail game={game} />)} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadRecentlyPlayedGames}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
