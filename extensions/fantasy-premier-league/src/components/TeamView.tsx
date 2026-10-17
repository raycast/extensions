import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { entryUrl, FplError } from "../api/fpl";
import type { Fixture, Pick } from "../api/types";
import { useTeam } from "../hooks";
import { BootstrapIndex, positionShort, teamBadgeUrl, teamShort } from "../lib/bootstrap";
import { chipLabel, fdrColor, formatDeadline, formatNumber, formatPrice, statusColor } from "../lib/format";
import { EntryNotFound, PreferencesAction } from "./MissingTeamId";
import { PitchView } from "./PitchView";
import { PlayerDetail } from "./PlayerDetail";

interface Props {
  entryId: number;
  /** Gameweek to show initially; defaults to the entry's current gameweek. */
  initialEvent?: number;
}

export function TeamView({ entryId, initialEvent }: Props) {
  const {
    index,
    entry,
    entryError,
    event,
    setEvent,
    gameweeks,
    eventInfo,
    picks,
    livePoints,
    fixtures,
    bonus,
    autoSubsIn,
    autoSubsOut,
    isLoading,
  } = useTeam(entryId, initialEvent);

  if (entryError instanceof FplError && entryError.status === 404) return <EntryNotFound entryId={entryId} />;

  const starters = picks?.picks.filter((p) => p.position <= 11) ?? [];
  const bench = picks?.picks.filter((p) => p.position > 11) ?? [];
  const history = picks?.entry_history;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={entry ? `${entry.name} · GW${event ?? ""}` : "My Team"}
      searchBarPlaceholder="Filter squad"
      searchBarAccessory={
        gameweeks.length > 0 ? (
          <List.Dropdown tooltip="Gameweek" value={String(event ?? "")} onChange={(v) => setEvent(Number(v))}>
            {gameweeks.map((gw) => (
              <List.Dropdown.Item key={gw} value={String(gw)} title={`Gameweek ${gw}`} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {entry && history && (
        <List.Section title={`${entry.name} · ${entry.player_first_name} ${entry.player_last_name}`}>
          <List.Item
            icon={Icon.Trophy}
            title="Gameweek points"
            subtitle={String(history.points)}
            accessories={[
              ...(history.event_transfers_cost
                ? [{ tag: { value: `-${history.event_transfers_cost} hit`, color: Color.Red } }]
                : []),
              ...(picks?.active_chip ? [{ tag: { value: chipLabel(picks.active_chip), color: Color.Purple } }] : []),
              { text: `Avg ${eventInfo?.average_entry_score ?? "-"}` },
              { text: `GW rank ${formatNumber(history.rank)}` },
            ]}
            actions={<OpenActions entryId={entryId} event={event} />}
          />
          <List.Item
            icon={Icon.LineChart}
            title="Overall"
            subtitle={`${formatNumber(history.total_points)} pts`}
            accessories={[{ text: `Rank ${formatNumber(history.overall_rank)}` }]}
            actions={<OpenActions entryId={entryId} event={event} />}
          />
          <List.Item
            icon={Icon.Coins}
            title="Team value"
            subtitle={formatPrice(history.value)}
            accessories={[
              { text: `Bank ${formatPrice(history.bank)}` },
              { text: `Bench ${history.points_on_bench} pts` },
            ]}
            actions={<OpenActions entryId={entryId} event={event} />}
          />
          {index?.nextEvent && event === entry.current_event && (
            <List.Item
              icon={Icon.Clock}
              title={`${index.nextEvent.name} deadline`}
              subtitle={formatDeadline(index.nextEvent.deadline_time)}
              actions={<OpenActions entryId={entryId} event={event} />}
            />
          )}
        </List.Section>
      )}
      {index && (
        <>
          <List.Section title="Starting XI">
            {starters.map((pick) => (
              <PickItem
                key={pick.element}
                pick={pick}
                index={index}
                entryId={entryId}
                event={event}
                fixtures={fixtures}
                points={livePoints.get(pick.element)?.total_points}
                minutes={livePoints.get(pick.element)?.minutes}
                bonus={bonus.get(pick.element)}
                autoSub={autoSubsIn.has(pick.element) ? "in" : autoSubsOut.has(pick.element) ? "out" : undefined}
              />
            ))}
          </List.Section>
          <List.Section title="Bench">
            {bench.map((pick) => (
              <PickItem
                key={pick.element}
                pick={pick}
                index={index}
                entryId={entryId}
                event={event}
                fixtures={fixtures}
                points={livePoints.get(pick.element)?.total_points}
                minutes={livePoints.get(pick.element)?.minutes}
                bonus={bonus.get(pick.element)}
                autoSub={autoSubsIn.has(pick.element) ? "in" : autoSubsOut.has(pick.element) ? "out" : undefined}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function OpenActions({ entryId, event }: { entryId: number; event?: number }) {
  return (
    <ActionPanel>
      <ShowPitchAction entryId={entryId} event={event} />
      <Action.OpenInBrowser title="Open Team on FPL" url={entryUrl(entryId, event)} />
      <PreferencesAction />
    </ActionPanel>
  );
}

interface PickItemProps {
  pick: Pick;
  index: BootstrapIndex;
  entryId: number;
  event?: number;
  fixtures: Fixture[];
  points?: number;
  minutes?: number;
  bonus?: number;
  autoSub?: "in" | "out";
}

function PickItem({ pick, index, entryId, event, fixtures, points, minutes, bonus, autoSub }: PickItemProps) {
  const player = index.players.get(pick.element);
  if (!player) return null;
  const team = index.teams.get(player.team);
  const opponents = fixtures.filter((f) => f.team_h === player.team || f.team_a === player.team);
  const multiplier = pick.multiplier || 1;
  const started = opponents.some((f) => f.started || f.finished);
  const scored = points != null && started ? (points + (bonus ?? 0)) * multiplier : undefined;

  return (
    <List.Item
      icon={team ? { source: teamBadgeUrl(team), fallback: Icon.Person } : Icon.Person}
      title={player.web_name}
      subtitle={`${positionShort(index, player.element_type)} · ${team?.short_name ?? ""}`}
      keywords={[player.first_name, player.second_name, team?.name ?? ""]}
      accessories={[
        ...(player.status !== "a"
          ? [{ icon: { source: Icon.ExclamationMark, tintColor: statusColor(player.status) }, tooltip: player.news }]
          : []),
        ...(pick.is_captain ? [{ tag: { value: pick.multiplier === 3 ? "TC" : "C", color: Color.Yellow } }] : []),
        ...(pick.is_vice_captain ? [{ tag: { value: "V", color: Color.SecondaryText } }] : []),
        ...(autoSub
          ? [
              {
                tag: { value: autoSub === "in" ? "Auto sub in" : "Auto sub out", color: Color.Blue },
                tooltip: "Automatic substitution",
              },
            ]
          : []),
        ...(bonus
          ? [{ tag: { value: `+${bonus} bonus`, color: Color.Yellow }, tooltip: "Provisional bonus from BPS" }]
          : []),
        ...(opponents.length
          ? opponents.map((f) => {
              const home = f.team_h === player.team;
              return {
                tag: {
                  value: `${teamShort(index, home ? f.team_a : f.team_h)} (${home ? "H" : "A"})`,
                  color: fdrColor(home ? f.team_h_difficulty : f.team_a_difficulty),
                },
              };
            })
          : [{ tag: { value: "Blank", color: Color.SecondaryText } }]),
        { text: formatPrice(player.now_cost) },
        {
          text: scored != null ? `${scored} pts` : "-",
          tooltip: minutes != null ? `${minutes} min` : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Player Details"
            icon={Icon.Sidebar}
            target={<PlayerDetail player={player} index={index} />}
          />
          <Action.OpenInBrowser title="Open Team on FPL" url={entryUrl(entryId, event)} />
          <ShowPitchAction entryId={entryId} event={event} />
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}

function ShowPitchAction({ entryId, event }: { entryId: number; event?: number }) {
  return (
    <Action.Push
      title="Show as Pitch"
      icon={Icon.AppWindowGrid3x3}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      target={<PitchView entryId={entryId} initialEvent={event} />}
    />
  );
}
