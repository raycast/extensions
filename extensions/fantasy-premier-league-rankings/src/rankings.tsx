import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { entryUrl, fetchLeagueStandings, FplError, leagueUrl } from "./api/fpl";
import type { ClassicLeagueSummary } from "./api/types";
import { EntryNotFound, MissingTeamId, PreferencesAction } from "./components/MissingTeamId";
import { TeamView } from "./components/TeamView";
import { getTeamId, useEntry } from "./hooks";
import { formatNumber, formatRankMove } from "./lib/format";

export default function Command() {
  const teamId = getTeamId();
  if (!teamId) return <MissingTeamId />;
  return <Leagues entryId={teamId} />;
}

function Leagues({ entryId }: { entryId: number }) {
  const { data: entry, error, isLoading } = useEntry(entryId);
  if (error instanceof FplError && error.status === 404) return <EntryNotFound entryId={entryId} />;

  const leagues = entry?.leagues.classic ?? [];
  const invitational = leagues.filter((l) => l.league_type === "x");
  const general = leagues.filter((l) => l.league_type !== "x");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter leagues">
      <List.Section title="Invitational leagues">
        {invitational.map((league) => (
          <LeagueItem key={league.id} league={league} entryId={entryId} />
        ))}
      </List.Section>
      <List.Section title="General leagues">
        {general.map((league) => (
          <LeagueItem key={league.id} league={league} entryId={entryId} />
        ))}
      </List.Section>
    </List>
  );
}

function LeagueItem({ league, entryId }: { league: ClassicLeagueSummary; entryId: number }) {
  const move = formatRankMove(league.entry_rank, league.entry_last_rank);
  return (
    <List.Item
      icon={league.league_type === "x" ? Icon.TwoPeople : Icon.Globe}
      title={league.name}
      subtitle={league.rank_count ? `${formatNumber(league.rank_count)} teams` : undefined}
      accessories={[
        ...(move
          ? [
              {
                text: {
                  value: move,
                  color: move.startsWith("↑") ? Color.Green : move.startsWith("↓") ? Color.Red : Color.SecondaryText,
                },
              },
            ]
          : []),
        { text: `#${formatNumber(league.entry_rank)}` },
        ...(league.entry_percentile_rank != null ? [{ text: `Top ${league.entry_percentile_rank}%` }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Standings"
            icon={Icon.List}
            target={<Standings leagueId={league.id} leagueName={league.name} entryId={entryId} />}
          />
          <Action.OpenInBrowser title="Open League on FPL" url={leagueUrl(league.id)} />
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}

function Standings({ leagueId, leagueName, entryId }: { leagueId: number; leagueName: string; entryId: number }) {
  // FPL pages standings 50 at a time; Raycast loads the next page as the list scrolls.
  const { data, isLoading, pagination } = useCachedPromise(
    (id: number) => async (options: { page: number }) => {
      const { standings } = await fetchLeagueStandings(id, options.page + 1);
      return { data: standings.results, hasMore: standings.has_next };
    },
    [leagueId],
  );
  const rows = data ?? [];
  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={leagueName}
      searchBarPlaceholder="Filter managers"
    >
      {rows.map((row) => {
        const isMe = row.entry === entryId;
        const move = formatRankMove(row.rank, row.last_rank);
        return (
          <List.Item
            key={row.entry}
            icon={{
              source: row.rank === 1 ? Icon.Trophy : Icon.Person,
              tintColor: isMe ? Color.Green : row.rank === 1 ? Color.Yellow : Color.SecondaryText,
            }}
            title={`${row.rank}. ${row.entry_name}`}
            subtitle={row.player_name}
            keywords={[row.player_name]}
            accessories={[
              ...(move
                ? [
                    {
                      text: {
                        value: move,
                        color: move.startsWith("↑")
                          ? Color.Green
                          : move.startsWith("↓")
                            ? Color.Red
                            : Color.SecondaryText,
                      },
                    },
                  ]
                : []),
              { text: `GW ${row.event_total}` },
              { text: `${formatNumber(row.total)} pts` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Team" icon={Icon.TwoPeople} target={<TeamView entryId={row.entry} />} />
                <Action.OpenInBrowser title="Open Team on FPL" url={entryUrl(row.entry)} />
                <Action.OpenInBrowser title="Open League on FPL" url={leagueUrl(leagueId)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
