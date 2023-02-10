import { List } from "@raycast/api";
import { Day } from "../types/schedule.types";
import GameComponent from "../components/Game";

type PropTypes = {
  day: Day;
};

const DayComponent = ({ day }: PropTypes) => {
  return (
    <List.Section key={day.date} title={day.date}>
      {day.games.map((game) => (
        <GameComponent key={game.id} game={game} />
      ))}
    </List.Section>
  );
};

export default DayComponent;
