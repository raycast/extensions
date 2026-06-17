import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import UserProfile from "../views/profile";
import useTaskLeaderboard from "../hooks/useTaskLeadboard";
import generateTaskLeaderboardAccessories from "../utils/generateTaskLeaderboardAccessories";
import { useState } from "react";
import TaskLeaderboardDetail from "./TaskLeaderboardDetail";

type PropTypes = {
  taskId: string;
  taskName: string;
  weaponId: string;
};

const TaskLeaderboardComponent = ({ taskId, taskName, weaponId }: PropTypes) => {
  const { data, isLoading } = useTaskLeaderboard({
    taskId: taskId,
    weaponId: weaponId,
  });
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const rankColors = [Color.Yellow, Color.SecondaryText, Color.Orange];

  return (
    <List
      searchBarPlaceholder="Filter on username"
      navigationTitle={taskName}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
    >
      {data && data.data.length > 0 ? (
        <List.Section title={"Total Players: " + data.metadata.totalRows}>
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
              accessories={isShowingDetail ? undefined : generateTaskLeaderboardAccessories(leaderboardData)}
              detail={<TaskLeaderboardDetail leaderboardData={leaderboardData} />}
              title={leaderboardData.username}
              actions={
                <ActionPanel title="Leaderboard Actions">
                  <Action
                    title={isShowingDetail ? "Hide Leaderboard Info" : "Show Leaderboard Info"}
                    icon={Icon.Sidebar}
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
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

export default TaskLeaderboardComponent;
