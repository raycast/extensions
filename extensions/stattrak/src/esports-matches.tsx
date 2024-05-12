import { ActionPanel, Color, Icon, List, Action } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { chain } from "lodash";
import { format as formatDate, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";

import { useMatches } from "./lib/hooks/use-matches";
import { GamesDropdown } from "./lib/components/game-dropdown";
import { Matche } from "./lib/models";

export default function EsportsMatches() {
  const [game, setGame] = useCachedState<string>("game", "155a7de6-ccbb-4a45-8656-0af98f10086a");

  const { matches, isLoading } = useMatches(game);

  const sections = chain(matches)
    .groupBy((matche) => formatDate(matche.scheduledAt, "yyyy-MM-dd"))
    .entries()
    .orderBy(([time]) => time, ["desc"])
    .value();

  return (
    <List
      isLoading={isLoading}
      //selectedItemId={tournaments[0]?.id}
      searchBarPlaceholder="Search tournaments"
      searchBarAccessory={<GamesDropdown value={game} onChange={setGame} />}
    >
      {sections.map(([time, items]) => {
        const date = new Date(time);
        let prefix = formatDate(date, "EEEE");
        if (isToday(date)) {
          prefix = "Today";
        } else if (isYesterday(date)) {
          prefix = "Yesterday";
        } else if (isTomorrow(date)) {
          prefix = "Tomorrow";
        }
        const title = `${prefix} - ${formatDate(date, "MMMM d")}${isThisYear(date) ? "" : formatDate(date, ", yyyy")}`;

        return (
          <List.Section key={time} title={title}>
            {items.map((item: Matche) => {
              let icon: List.Item.Props["icon"];
              switch (item.status) {
                case "completed":
                  icon = {
                    source: Icon.CheckCircle,
                    tintColor: Color.Green,
                    tooltip: "Finished",
                  };
                  break;
                case "running":
                  icon = {
                    source: Icon.Livestream,
                    tintColor: Color.Red,
                    tooltip: "Live",
                  };
                  break;
                case "not_started":
                default:
                  icon = {
                    source: Icon.Calendar,
                    tintColor: Color.SecondaryText,
                    tooltip: "Scheduled",
                  };
                  break;
              }

              const strategy = {
                text: `BO${item.numberOfGames}`,
                tooltip: `Best of ${item.numberOfGames}`,
              };

              const title = `${item.teamA?.name ?? "TBD"} VS ${item.teamB?.name ?? "TBD"}`;

              const subtitle = item.league.name;

              return (
                <List.Item
                  key={item.id}
                  id={item.id}
                  icon={icon}
                  title={title}
                  subtitle={subtitle}
                  accessories={[strategy]}
                  keywords={[item.name, item.league.name, item.game.name]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={`https://www.stattrak.gg/matches/${item.slug}/`} />
                      <Action.CopyToClipboard
                        title="Copy Pull Request URL"
                        content={`https://www.stattrak.gg/matches/${item.slug}/`}
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
