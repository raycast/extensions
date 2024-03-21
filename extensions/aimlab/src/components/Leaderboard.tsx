import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { SeasonTasks } from "../types/season.types";
import useSeasonalLeaderboard from "../hooks/useSeasonalLeadboard";
import generateLeaderboardAccessories from "../utils/generateLeaderboardAccessories";
import UserProfile from "../views/profile";

type PropTypes = {
  seasonTask: SeasonTasks;
  taskName: string;
};

const LeaderboardComponent = ({ seasonTask, taskName }: PropTypes) => {
  const { data, isLoading } = useSeasonalLeaderboard({
    seasonId: seasonTask.seasonId,
    taskId: seasonTask.taskId,
    weaponId: seasonTask.weaponId,
    modeId: seasonTask.modeId,
  });

  const rankColors = [Color.Yellow, Color.SecondaryText, Color.Orange];

  return (
    <List searchBarPlaceholder="Filter on username" navigationTitle={taskName} isLoading={isLoading}>
      {data && data.data.length > 0 ? (
        <List.Section title="Top 100 players" subtitle={"total players: " + data.metadata.totalRows}>
          {data.data.map((leaderboardData) => (
            <List.Item
              icon={
                leaderboardData.rank <= 3
                  ? {
                      value: { source: Icon.Leaderboard, tintColor: rankColors[leaderboardData.rank - 1] },
                      tooltip: "Rank: " + leaderboardData.rank,
                    }
                  : ""
              }
              key={leaderboardData.user_id}
              subtitle={{ value: "#" + leaderboardData.rank, tooltip: "Rank" }}
              accessories={generateLeaderboardAccessories(leaderboardData)}
              title={leaderboardData.username}
              actions={
                <ActionPanel title="Leaderboard Actions">
                  <Action.Push
                    title="Show Player Details"
                    icon={Icon.ArrowRight}
                    target={<UserProfile username={leaderboardData.username} />}
                  />
                  <Action.OpenInBrowser
                    title="View Player on Aimlab"
                    url={"https://aimlab.gg/u/" + encodeURIComponent(leaderboardData.username)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon="logo.png"
          title="Nothing found!"
          description="Please visit the website instead"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Leaderboards on Aimlab" url={"https://aimlab.gg/aimlab/leaderboards"} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default LeaderboardComponent;
