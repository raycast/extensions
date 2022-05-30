import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Game } from "../schedule.types";
import generateAccessories from "../utils/generateAccessories";

type PropTypes = {
  game: Game;
};

const GameComponent = ({ game }: PropTypes) => {
  return (
    <List.Item
      key={game.id}
      title={game.shortName}
      icon={game.competitors[0].logo}
      accessories={generateAccessories(game)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={game.stream} title="View on ESPN" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
};

export default GameComponent;
