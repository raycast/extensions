import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchLive, fixturesUrl } from "../api/fpl";
import type { Fixture, Player } from "../api/types";
import { BootstrapIndex, positionShort, teamBadgeUrl, teamName } from "../lib/bootstrap";
import { formatKickoff, formatPrice, statusColor } from "../lib/format";
import { PlayerDetail } from "./PlayerDetail";

interface Props {
  fixture: Fixture;
  index: BootstrapIndex;
  squad?: Set<number>;
}

/** Both squads for one fixture, with live points once it has kicked off. */
export function FixtureDetail({ fixture, index, squad }: Props) {
  const started = fixture.started || fixture.finished;
  const { data: live, isLoading } = useCachedPromise(fetchLive, [fixture.event ?? 0], {
    execute: started && fixture.event != null,
  });
  const points = new Map(live?.elements.map((e) => [e.id, e.stats]) ?? []);

  const playersOf = (teamId: number) =>
    [...index.players.values()]
      .filter((p) => p.team === teamId && (!started || (points.get(p.id)?.minutes ?? 0) > 0))
      .sort((a, b) =>
        started
          ? (points.get(b.id)?.total_points ?? 0) - (points.get(a.id)?.total_points ?? 0) ||
            b.total_points - a.total_points
          : b.total_points - a.total_points,
      );

  const score = started ? `${fixture.team_h_score ?? 0} - ${fixture.team_a_score ?? 0}` : "v";
  const title = `${teamName(index, fixture.team_h)} ${score} ${teamName(index, fixture.team_a)}`;

  const item = (player: Player) => {
    const team = index.teams.get(player.team);
    const stats = points.get(player.id);
    return (
      <List.Item
        key={player.id}
        icon={team ? { source: teamBadgeUrl(team), fallback: Icon.Person } : Icon.Person}
        title={player.web_name}
        subtitle={positionShort(index, player.element_type)}
        keywords={[player.first_name, player.second_name]}
        accessories={[
          ...(squad?.has(player.id) ? [{ icon: Icon.Star, tooltip: "In your squad" }] : []),
          ...(player.status !== "a"
            ? [{ icon: { source: Icon.ExclamationMark, tintColor: statusColor(player.status) }, tooltip: player.news }]
            : []),
          { text: formatPrice(player.now_cost) },
          { text: `${player.selected_by_percent}%`, tooltip: "Ownership" },
          ...(stats
            ? [
                { text: `${stats.minutes}'`, tooltip: "Minutes" },
                ...(stats.goals_scored ? [{ tag: { value: `⚽ ${stats.goals_scored}`, color: Color.Green } }] : []),
                ...(stats.assists ? [{ tag: { value: `A ${stats.assists}`, color: Color.Blue } }] : []),
                ...(stats.bonus ? [{ tag: { value: `B ${stats.bonus}`, color: Color.Yellow } }] : []),
                { tag: { value: `${stats.total_points} pts`, color: Color.SecondaryText } },
              ]
            : [
                { text: `Form ${player.form}` },
                { tag: { value: `${player.total_points} pts`, color: Color.SecondaryText } },
              ]),
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Player Details"
              icon={Icon.Sidebar}
              target={<PlayerDetail player={player} index={index} />}
            />
            <Action.OpenInBrowser title="Open Fixtures on FPL" url={fixturesUrl(fixture.event ?? 1)} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchBarPlaceholder={`${formatKickoff(fixture.kickoff_time)} · filter players`}
    >
      <List.Section title={`${teamName(index, fixture.team_h)} (H)`} subtitle={`FDR ${fixture.team_h_difficulty}`}>
        {playersOf(fixture.team_h).map(item)}
      </List.Section>
      <List.Section title={`${teamName(index, fixture.team_a)} (A)`} subtitle={`FDR ${fixture.team_a_difficulty}`}>
        {playersOf(fixture.team_a).map(item)}
      </List.Section>
    </List>
  );
}
