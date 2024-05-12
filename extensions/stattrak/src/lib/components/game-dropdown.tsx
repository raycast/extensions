import { List } from "@raycast/api";

import { useGames } from "../hooks/use-games";
import { Game } from "../models";

export function GamesDropdown(props: { value: string; onChange: (value: string) => void }) {
  const { games } = useGames();

  return (
    <List.Dropdown tooltip="Select Game" placeholder="Search Game" {...props}>
      {games
        ?.filter((item) => item.fantasy)
        .map((game: Game) => <List.Dropdown.Item key={game.id} value={game.id} icon={game.icon} title={game.name} />)}
    </List.Dropdown>
  );
}
