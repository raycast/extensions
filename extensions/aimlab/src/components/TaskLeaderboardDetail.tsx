import { Icon, List } from "@raycast/api";
import { TaskLeaderboardData } from "../types/taskleaderboard.types";

type PropTypes = {
  leaderboardData: TaskLeaderboardData;
};

const TaskLeaderboardDetail = ({ leaderboardData }: PropTypes) => {
  function roundNumber(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={leaderboardData.username} icon={Icon.Person} />
          <List.Item.Detail.Metadata.Label
            title="Ended at"
            text={new Date(leaderboardData.ended_at).toLocaleDateString()}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Targets" text={leaderboardData?.targets.toString()} />
          <List.Item.Detail.Metadata.Label title="Kills" text={leaderboardData?.kills.toString()} />
          {leaderboardData.shots_fired && (
            <List.Item.Detail.Metadata.Label title="Shots Fired" text={leaderboardData.shots_fired.toString()} />
          )}
          {leaderboardData.shots_hit && (
            <List.Item.Detail.Metadata.Label title="Shots Hit" text={leaderboardData.shots_hit.toString()} />
          )}
          {leaderboardData.shots_hit_head && (
            <List.Item.Detail.Metadata.Label title="Shots Hit Head" text={leaderboardData.shots_hit_head.toString()} />
          )}
          {leaderboardData.shots_hit_body && (
            <List.Item.Detail.Metadata.Label title="Shots Hit Body" text={leaderboardData.shots_hit_body.toString()} />
          )}
          {leaderboardData.accuracy && (
            <List.Item.Detail.Metadata.Label title="Accuracy" text={roundNumber(leaderboardData.accuracy) + "%"} />
          )}
          {leaderboardData.shots_per_kill && (
            <List.Item.Detail.Metadata.Label
              title="Shots Per Kill"
              text={roundNumber(leaderboardData.shots_per_kill).toString()}
            />
          )}
          {leaderboardData.time_per_kill && (
            <List.Item.Detail.Metadata.Label
              title="Time Per Kill"
              text={roundNumber(leaderboardData.time_per_kill) + "ms"}
            />
          )}
          {leaderboardData.avg_score && (
            <List.Item.Detail.Metadata.Label title="Avg Score" text={leaderboardData.avg_score.toString()} />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Quicklinks" />
          <List.Item.Detail.Metadata.Link
            title="View on Aimlab"
            target={"https://aimlab.gg/u/" + encodeURIComponent(leaderboardData.username)}
            text={leaderboardData.username}
          />
          <List.Item.Detail.Metadata.Link
            title="Find a coach to help you improve"
            target="https://playerbase.com/"
            text="Playerbase"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default TaskLeaderboardDetail;
