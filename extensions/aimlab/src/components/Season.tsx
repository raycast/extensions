import { List } from "@raycast/api";
import { Season } from "../types/season.types";
import SeasonTaskComponent from "./SeasonTask";

type PropTypes = {
  season: Season;
};

const SeasonComponent = ({ season }: PropTypes) => {
  const startDate = new Date(season.startDate);
  const endDate = new Date(season.endDate);

  return (
    <List.Section
      title={`Season: ${season.name}`}
      subtitle={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`}
    >
      {season.tasks && season.tasks.length > 0
        ? season.tasks?.map((task) => {
            return <SeasonTaskComponent key={task.taskId} season={season} seasonTask={task} />;
          })
        : null}
    </List.Section>
  );
};

export default SeasonComponent;
