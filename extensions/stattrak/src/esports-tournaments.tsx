/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionPanel, List, Action } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { chain } from "lodash";

import { useTournaments } from "./lib/hooks/use-tournaments";
import { GamesDropdown } from "./lib/components/game-dropdown";
import { Tournament } from "./lib/models";

export default function EsportsTournaments() {
  const [game, setGame] = useCachedState<string>("game", "155a7de6-ccbb-4a45-8656-0af98f10086a");

  const { tournaments, isLoading } = useTournaments(game);

  const sections = chain(tournaments)
    .groupBy((tournament: any) => tournament.game.name)
    .entries()
    .value();

  return (
    <List
      isLoading={isLoading}
      //selectedItemId={tournaments[0]?.id}
      searchBarPlaceholder="Search tournaments"
      searchBarAccessory={<GamesDropdown value={game} onChange={setGame} />}
    >
      {sections.map(([item, items]) => {
        return (
          <List.Section key={item} title={item}>
            {items.map((item: Tournament) => {
              const strategy = {
                text: `T${item.tier}`,
                tooltip: `Tier ${item.tier}`,
              };

              return (
                <List.Item
                  key={item.id}
                  id={item.id}
                  icon={item.image}
                  title={item.name}
                  subtitle={item.game.name}
                  accessories={[strategy]}
                  keywords={[item.name, item.game.name]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={`https://www.stattrak.gg/leagues/${item.slug}/`} />
                      <Action.CopyToClipboard
                        title="Copy Pull Request URL"
                        content={`https://www.stattrak.gg/leagues/${item.slug}/`}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
