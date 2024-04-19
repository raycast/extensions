import { List, ActionPanel, Action } from "@raycast/api";
import { getDnd } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import MonsterDetail from "./templates/monsterDetail";
interface monstersType {
  isLoading: boolean;
  data: indexCollection;
}

export default function Command() {
  const monsters = getDnd("/api/monsters") as monstersType;

  if (monsters?.data) {
    return (
      <List
        searchBarPlaceholder={`Searching ${monsters.data.results.length} monsters...`}
        throttle={true}
        filtering={true}
        isLoading={monsters.isLoading}
      >
        {monsters?.data.results?.map((monster: index) => (
          <List.Item
            key={monster.index}
            title={monster.name}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Show Details`}
                  target={
                    <MonsterDetail key={monster.index} index={monster.index} name={monster.name} url={monster.url} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}
