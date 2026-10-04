import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { entryUrl, fetchTransfers, FplError } from "./api/fpl";
import { EntryNotFound, MissingTeamId, PreferencesAction } from "./components/MissingTeamId";
import { TeamView } from "./components/TeamView";
import { getTeamId, useBootstrap, useEntryHistory } from "./hooks";
import { playerName } from "./lib/bootstrap";
import { chipLabel, formatNumber, formatPrice, formatRankMove } from "./lib/format";

export default function Command() {
  const teamId = getTeamId();
  if (!teamId) return <MissingTeamId />;
  return <History entryId={teamId} />;
}

function History({ entryId }: { entryId: number }) {
  const { index, isLoading: loadingBootstrap } = useBootstrap();
  const { data: history, error, isLoading } = useEntryHistory(entryId);
  const { data: transfers } = useCachedPromise(fetchTransfers, [entryId]);

  if (error instanceof FplError && error.status === 404) return <EntryNotFound entryId={entryId} />;

  const gameweeks = [...(history?.current ?? [])].reverse();
  const chipsByEvent = new Map(history?.chips.map((c) => [c.event, c.name]) ?? []);
  const transfersByEvent = new Map<number, string[]>();
  if (index) {
    for (const t of transfers ?? []) {
      const list = transfersByEvent.get(t.event) ?? [];
      list.push(`${playerName(index, t.element_out)} → ${playerName(index, t.element_in)}`);
      transfersByEvent.set(t.event, list);
    }
  }

  return (
    <List isLoading={isLoading || loadingBootstrap} searchBarPlaceholder="Filter gameweeks">
      <List.Section title="This season">
        {gameweeks.map((gw, i) => {
          const previous = gameweeks[i + 1];
          const chip = chipsByEvent.get(gw.event);
          const gwTransfers = transfersByEvent.get(gw.event) ?? [];
          const average = index?.events.find((e) => e.id === gw.event)?.average_entry_score;
          return (
            <List.Item
              key={gw.event}
              icon={{ source: Icon.Calendar, tintColor: pointsColor(gw.points, average) }}
              title={`Gameweek ${gw.event}`}
              subtitle={`${gw.points} pts${average != null ? ` (avg ${average})` : ""}`}
              keywords={gwTransfers}
              accessories={[
                ...(chip ? [{ tag: { value: chipLabel(chip), color: Color.Purple } }] : []),
                ...(gw.event_transfers_cost
                  ? [{ tag: { value: `-${gw.event_transfers_cost}`, color: Color.Red } }]
                  : []),
                {
                  text: `${gw.event_transfers} FT`,
                  tooltip: gwTransfers.join("\n") || "No transfers",
                },
                { text: `Bench ${gw.points_on_bench}` },
                { text: formatPrice(gw.value), tooltip: `Bank ${formatPrice(gw.bank)}` },
                {
                  text: `${formatNumber(gw.overall_rank)} ${formatRankMove(gw.overall_rank, previous?.overall_rank ?? null)}`,
                  tooltip: `GW rank ${formatNumber(gw.rank)}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Picks"
                    icon={Icon.TwoPeople}
                    target={<TeamView entryId={entryId} initialEvent={gw.event} />}
                  />
                  <Action.OpenInBrowser title="Open on FPL" url={entryUrl(entryId, gw.event)} />
                  <PreferencesAction />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Chips">
        {history?.chips.map((chip) => (
          <List.Item
            key={chip.name + chip.event}
            icon={Icon.Star}
            title={chipLabel(chip.name)}
            subtitle={`Gameweek ${chip.event}`}
          />
        ))}
      </List.Section>
      <List.Section title="Past seasons">
        {history?.past.map((season) => (
          <List.Item
            key={season.season_name}
            icon={Icon.Clock}
            title={season.season_name}
            subtitle={`${formatNumber(season.total_points)} pts`}
            accessories={[{ text: `Rank ${formatNumber(season.rank)}` }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function pointsColor(points: number, average?: number): Color {
  if (average == null) return Color.SecondaryText;
  if (points >= average + 10) return Color.Green;
  if (points < average) return Color.Red;
  return Color.Yellow;
}
