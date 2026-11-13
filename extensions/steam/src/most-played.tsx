import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { DefaultActions, LaunchActions } from "./components/Actions";
import { GameDetails } from "./components/GameDetails";
import { PlayerStats } from "./components/PlayerStats";
import { cachedDetails } from "./lib/details";
import { useResultsWithDetails } from "./lib/fetcher";
import { compactPlayers, formatPlayers, getTopGames, TopGame } from "./lib/players";

type Kind = "now" | "weekly";

function movement(game: TopGame): List.Item.Accessory | undefined {
  if (!game.lastWeekRank || game.lastWeekRank <= 0)
    return { tag: { value: "New", color: Color.Blue }, tooltip: "Not in last week's top 100" };
  const moved = game.lastWeekRank - game.rank;
  if (moved === 0) return { text: { value: "–", color: Color.SecondaryText }, tooltip: "Same rank as last week" };
  return moved > 0
    ? { text: { value: `▲${moved}`, color: Color.Green }, tooltip: `Up from #${game.lastWeekRank}` }
    : { text: { value: `▼${-moved}`, color: Color.Red }, tooltip: `Down from #${game.lastWeekRank}` };
}

export default function Command() {
  const [kind, setKind] = useCachedState<Kind>("most-played-kind", "now");
  const { data, isLoading, error, revalidate } = useCachedPromise(getTopGames, [kind], { keepPreviousData: true });
  const { games, loading } = useResultsWithDetails(data);

  return (
    <List
      isLoading={isLoading || loading}
      searchBarPlaceholder="Filter by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Ranking" value={kind} onChange={(value) => setKind(value as Kind)}>
          <List.Dropdown.Item title="Playing Now" value="now" icon={Icon.TwoPeople} />
          <List.Dropdown.Item title="Weekly Top" value="weekly" icon={Icon.Calendar} />
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load the Most Played Games"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.TwoPeople} title={isLoading ? "Loading Most Played Games…" : "No Games"} />
      )}
      {games?.map((game) => {
        const details = cachedDetails(game.appid);
        const name = details?.data.name ?? `App ${game.appid}`;
        const accessories: List.Item.Accessory[] = [];
        // Read the chart from the row, since old rows stay on screen while a new chart loads
        if (game.chart === "weekly") {
          const moved = movement(game);
          if (moved) accessories.push(moved);
        }
        if (game.players !== undefined) {
          accessories.push({
            text: { value: compactPlayers(game.players), color: Color.Green },
            icon: { source: Icon.TwoPeople, tintColor: Color.Green },
            tooltip: `${formatPlayers(game.players)} playing now`,
          });
        }
        if (game.peak !== undefined) {
          accessories.push({
            text: compactPlayers(game.peak),
            icon: Icon.ArrowUp,
            tooltip: `${formatPlayers(game.peak)} peak ${game.chart === "weekly" ? "this week" : "today"}`,
          });
        }
        return (
          <List.Item
            key={game.appid}
            title={`${game.rank}. ${name}`}
            keywords={[name]}
            icon={details?.icon ? { source: details.icon } : Icon.GameController}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.TwoPeople}
                  title="View Player Count"
                  target={<PlayerStats appid={game.appid} name={name} />}
                />
                <Action.Push
                  icon={Icon.Sidebar}
                  title="View Game Details"
                  target={<GameDetails game={{ appid: game.appid, name, icon: details?.icon }} />}
                />
                <LaunchActions name={name} appid={game.appid} showPlayerCount={false} />
                <DefaultActions />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
