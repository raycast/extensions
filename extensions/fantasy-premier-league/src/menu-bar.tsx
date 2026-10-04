import { Icon, LaunchType, MenuBarExtra, launchCommand, open, openExtensionPreferences } from "@raycast/api";
import { entryUrl, FplError, transfersUrl } from "./api/fpl";
import type { Pick } from "./api/types";
import { getTeamId, useTeam } from "./hooks";
import { BootstrapIndex, positionShort, teamBadgeUrl, teamShort } from "./lib/bootstrap";
import { formatDeadline, formatNumber } from "./lib/format";

export default function Command() {
  const teamId = getTeamId();
  if (!teamId) {
    return (
      <MenuBarExtra icon={Icon.SoccerBall} title="FPL" tooltip="Set your FPL Team ID">
        <MenuBarExtra.Item title="Set Team ID" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }
  return <LiveTeam entryId={teamId} />;
}

const showCommand = (name: string) => () => launchCommand({ name, type: LaunchType.UserInitiated });

function LiveTeam({ entryId }: { entryId: number }) {
  const { index, entry, entryError, event, eventInfo, picks, livePoints, fixtures, bonus, isLoading } =
    useTeam(entryId);

  if (entryError instanceof FplError && entryError.status === 404) {
    return (
      <MenuBarExtra icon={Icon.SoccerBall} title="FPL" tooltip={`No FPL team with ID ${entryId}`}>
        <MenuBarExtra.Item title="Change Team ID" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  const history = picks?.entry_history;
  const hasKickedOff = (teamId: number) =>
    fixtures.some((f) => (f.team_h === teamId || f.team_a === teamId) && (f.started || f.finished));

  /** Live points for a pick, or undefined until the player's fixture has kicked off. */
  const scored = (pick: Pick): number | undefined => {
    const player = index?.players.get(pick.element);
    const stats = livePoints.get(pick.element);
    if (!player || !stats || !hasKickedOff(player.team)) return undefined;
    return (stats.total_points + (bonus.get(pick.element) ?? 0)) * pick.multiplier;
  };

  // Multiplier is 0 for the bench unless Bench Boost is active, so summing every pick is correct.
  const liveTotal = picks
    ? picks.picks.reduce((sum, p) => sum + (scored(p) ?? 0), 0) - (history?.event_transfers_cost ?? 0)
    : undefined;
  const anyLive = picks?.picks.some((p) => scored(p) != null) ?? false;
  const points = anyLive ? liveTotal : history?.points;

  const starters = picks?.picks.filter((p) => p.position <= 11) ?? [];
  const bench = picks?.picks.filter((p) => p.position > 11) ?? [];
  const openTeam = () => open(entryUrl(entryId, event));

  return (
    <MenuBarExtra
      icon={Icon.SoccerBall}
      title={points != null ? `${points}` : undefined}
      tooltip={entry ? `${entry.name} · Gameweek ${event ?? ""} points` : "Fantasy Premier League"}
      isLoading={isLoading}
    >
      {entry && history && (
        <MenuBarExtra.Section title={`${entry.name} · Gameweek ${event ?? ""}`}>
          <MenuBarExtra.Item
            title={`${points ?? "-"} points`}
            subtitle={[
              `avg ${eventInfo?.average_entry_score ?? "-"}`,
              history.event_transfers_cost ? `${history.event_transfers_cost} pt hit` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
            icon={Icon.Trophy}
            onAction={showCommand("my-team")}
          />
          <MenuBarExtra.Item
            title={`Overall rank ${formatNumber(history.overall_rank)}`}
            subtitle={`${formatNumber(history.total_points)} pts`}
            icon={Icon.LineChart}
            onAction={showCommand("history")}
          />
          {index?.nextEvent && (
            <MenuBarExtra.Item
              title={`${index.nextEvent.name} deadline`}
              subtitle={formatDeadline(index.nextEvent.deadline_time)}
              icon={Icon.Clock}
              onAction={() => open(transfersUrl)}
            />
          )}
        </MenuBarExtra.Section>
      )}
      {index && (
        <>
          <MenuBarExtra.Section title="Starting XI">
            {starters.map((pick) => (
              <PickItem key={pick.element} pick={pick} points={scored(pick)} index={index} onAction={openTeam} />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Bench">
            {bench.map((pick) => (
              <PickItem key={pick.element} pick={pick} points={scored(pick)} index={index} onAction={openTeam} />
            ))}
          </MenuBarExtra.Section>
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open My Team" icon={Icon.TwoPeople} onAction={showCommand("my-team")} />
        <MenuBarExtra.Item title="Price Changes" icon={Icon.Coins} onAction={showCommand("price-changes")} />
        <MenuBarExtra.Item title="Open on FPL" icon={Icon.Globe} onAction={openTeam} />
        <MenuBarExtra.Item title="Change Team ID" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

interface PickItemProps {
  pick: Pick;
  points?: number;
  index: BootstrapIndex;
  onAction: () => void;
}

function PickItem({ pick, points, index, onAction }: PickItemProps) {
  const player = index.players.get(pick.element);
  if (!player) return null;
  const team = index.teams.get(player.team);
  const marker = pick.is_captain ? (pick.multiplier === 3 ? " (TC)" : " (C)") : pick.is_vice_captain ? " (V)" : "";
  return (
    <MenuBarExtra.Item
      title={`${player.web_name}${marker}`}
      subtitle={points != null ? `${points} pts` : "-"}
      icon={team ? { source: teamBadgeUrl(team), fallback: Icon.Person } : Icon.Person}
      tooltip={`${positionShort(index, player.element_type)} · ${teamShort(index, player.team)}`}
      onAction={onAction}
    />
  );
}
