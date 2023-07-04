import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Season, SeasonTasks } from "../types/season.types";
import useTaskInformation from "../hooks/useTaskInformation";
import generateSeasonAccessories from "../utils/generateSeasonAccessories";
import LeaderboardComponent from "./Leaderboard";

type PropTypes = {
  season: Season;
  seasonTask: SeasonTasks;
};

const SeasonTaskComponent = ({ season, seasonTask }: PropTypes) => {
  const { data, isLoading } = useTaskInformation(seasonTask.taskId);

  return !isLoading && data ? (
    <List.Item
      title={data.name}
      accessories={generateSeasonAccessories(season)}
      keywords={[season.name, data.name]}
      actions={
        <ActionPanel title="Task Actions">
          <Action.Push
            title="Show Task Leaderboard"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            target={<LeaderboardComponent key={data.name} seasonTask={seasonTask} taskName={data.name} />}
          />
        </ActionPanel>
      }
    />
  ) : null;
};

export default SeasonTaskComponent;
