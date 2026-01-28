import { List, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getTitleTrophies, getUserTrophiesEarnedForTitle } from "psn-api";
import { getValidAuthorization } from "../utils/auth";
import { Game, Trophy } from "../types";
import { Color } from "@raycast/api";

interface GameDetailProps {
  game: Game;
}

export function GameDetail({ game }: GameDetailProps) {
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTrophies();
  }, []);

  async function loadTrophies() {
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
      const titleTrophyData = await getTitleTrophies(authorization, game.npCommunicationId, "all");
      const userTrophyData = await getUserTrophiesEarnedForTitle(authorization, "me", game.npCommunicationId, "all");

      if (titleTrophyData && titleTrophyData.trophies) {
        const trophiesData = titleTrophyData.trophies.map((trophy) => {
          // Find corresponding user trophy data
          const userTrophy = userTrophyData?.trophies?.find((userTrophy) => userTrophy.trophyId === trophy.trophyId);

          return {
            trophyId: trophy.trophyId,
            trophyHidden: trophy.trophyHidden,
            earned: userTrophy?.earned || false,
            trophyType: trophy.trophyType,
            trophyName: trophy.trophyName || "",
            trophyDetail: trophy.trophyDetail || "",
            trophyIconUrl: trophy.trophyIconUrl || "",
          };
        });

        setTrophies(trophiesData);

        await showToast({
          style: Toast.Style.Success,
          title: "Trophies loaded",
          message: `Found ${trophiesData.length} trophies`,
        });
      }
    } catch (error) {
      console.error("Error fetching trophies:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch trophies",
        message: "Unable to retrieve trophy data. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getTrophyIcon(trophyType: string): string {
    switch (trophyType.toLowerCase()) {
      case "platinum":
        return "../assets/platinum.png";
      case "gold":
        return "../assets/gold.png";
      case "silver":
        return "../assets/silver.png";
      case "bronze":
        return "../assets/bronze.png";
      default:
        return Icon.Trophy;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={game.trophyTitleName}>
      <List.Section title="Game Information">
        <List.Item
          icon={game.trophyTitleIconUrl || Icon.GameController}
          title={game.trophyTitleName}
          subtitle={`${game.trophyTitlePlatform} • ${game.progress}% Complete`}
          accessories={[
            { text: `${game.earnedTrophies.platinum}`, icon: "platinum.png" },
            { text: `${game.earnedTrophies.gold}`, icon: "gold.png" },
            { text: `${game.earnedTrophies.silver}`, icon: "silver.png" },
            { text: `${game.earnedTrophies.bronze}`, icon: "bronze.png" },
          ]}
        />
      </List.Section>

      <List.Section title="Trophies">
        {trophies.map((trophy) => (
          <List.Item
            key={trophy.trophyId}
            icon={getTrophyIcon(trophy.trophyType)}
            title={trophy.trophyName}
            subtitle={trophy.trophyDetail}
            accessories={[
              {
                icon: {
                  source: trophy.earned ? Icon.CheckCircle : Icon.Circle,
                  tintColor: trophy.earned ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
