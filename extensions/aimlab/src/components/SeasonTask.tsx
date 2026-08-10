import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Season, SeasonTasks } from "../types/season.types";
import generateSeasonAccessories from "../utils/generateSeasonAccessories";
import LeaderboardComponent from "./Leaderboard";

type PropTypes = {
  season: Season;
  seasonTask: SeasonTasks;
};

const SeasonTaskComponent = ({ season, seasonTask }: PropTypes) => {
  return (
    <List.Item
      title={seasonTask.name}
      accessories={generateSeasonAccessories(season)}
      keywords={[season.name, seasonTask.name]}
      actions={
        <ActionPanel title="Task Actions">
          <Action.Push
            title="Show Task Leaderboard"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            target={<LeaderboardComponent key={seasonTask.name} seasonTask={seasonTask} taskName={seasonTask.name} />}
          />
        </ActionPanel>
      }
    />
  );
};

export default SeasonTaskComponent;
