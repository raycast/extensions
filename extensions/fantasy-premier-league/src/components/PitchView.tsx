import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { entryUrl, FplError } from "../api/fpl";
import type { Pick } from "../api/types";
import { useTeam } from "../hooks";
import { positionShort } from "../lib/bootstrap";
import { chipLabel, formatDeadline, formatNumber, formatPrice } from "../lib/format";
import { PitchCard, renderPitchSvg } from "../lib/pitchSvg";
import { EntryNotFound, PreferencesAction } from "./MissingTeamId";
import { TeamView } from "./TeamView";

interface Props {
  entryId: number;
  initialEvent?: number;
}

const shirtKey = (teamCode: number, goalkeeper: boolean) => `${teamCode}${goalkeeper ? "_1" : ""}`;

/** Downloads FPL shirt images and returns them as data URLs keyed by shirtKey. Cached by @raycast/utils. */
async function loadShirts(keys: string): Promise<Record<string, string>> {
  const shirts: Record<string, string> = {};
  await Promise.all(
    keys.split(",").map(async (key) => {
      const response = await fetch(`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${key}-220.webp`);
      if (!response.ok) return;
      const bytes = Buffer.from(await response.arrayBuffer());
      shirts[key] = `data:image/webp;base64,${bytes.toString("base64")}`;
    }),
  );
  return shirts;
}

export function PitchView({ entryId, initialEvent }: Props) {
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

  const shirtKeys = useMemo(() => {
    if (!index || !picks) return "";
    const keys = picks.picks.map((p) => {
      const player = index.players.get(p.element);
      const team = player && index.teams.get(player.team);
      return team ? shirtKey(team.code, player.element_type === 1) : "";
    });
    return [...new Set(keys.filter(Boolean))].sort().join(",");
  }, [index, picks]);
  const { data: shirts } = useCachedPromise(loadShirts, [shirtKeys], { execute: shirtKeys !== "" });

  const svg = useMemo(() => {
    if (!index || !entry || !picks) return undefined;
    const history = picks.entry_history;
    const toCard = (pick: Pick, label?: string): PitchCard | undefined => {
      const player = index.players.get(pick.element);
      const team = player && index.teams.get(player.team);
      if (!player || !team) return undefined;
      const started = fixtures.some(
        (f) => (f.team_h === player.team || f.team_a === player.team) && (f.started || f.finished),
      );
      const stats = livePoints.get(player.id);
      return {
        name: player.web_name,
        points: stats && started ? String(stats.total_points * (pick.multiplier || 1)) : undefined,
        shirt: shirts?.[shirtKey(team.code, player.element_type === 1)],
        captain: pick.is_captain,
        tripleCaptain: pick.multiplier === 3,
        vice: pick.is_vice_captain,
        flagged: player.status !== "a",
        provisionalBonus: started ? bonus.get(player.id) : undefined,
        autoSub: autoSubsIn.has(player.id) ? "in" : autoSubsOut.has(player.id) ? "out" : undefined,
        label,
      };
    };
    const starters = picks.picks.filter((p) => p.position <= 11);
    const line = (type: number) =>
      starters
        .filter((p) => index.players.get(p.element)?.element_type === type)
        .map((p) => toCard(p))
        .filter((c): c is PitchCard => !!c);
    const bench = picks.picks
      .filter((p) => p.position > 11)
      .map((p, i) => {
        const player = index.players.get(p.element);
        const pos = player ? positionShort(index, player.element_type) : "";
        return toCard(p, i === 0 ? pos : `${i}. ${pos}`);
      })
      .filter((c): c is PitchCard => !!c);

    return renderPitchSvg({
      title: entry.name,
      subtitle: eventInfo?.name ?? `Gameweek ${event}`,
      stats: [
        { value: String(eventInfo?.average_entry_score ?? "-"), label: "Average Points" },
        { value: String(eventInfo?.highest_score ?? "-"), label: "Highest Points" },
        { value: formatNumber(history.rank), label: "GW Rank" },
        {
          value: history.event_transfers_cost
            ? `${history.event_transfers} (-${history.event_transfers_cost})`
            : String(history.event_transfers),
          label: "Transfers",
        },
      ],
      highlight: {
        value: String(history.points),
        label: "Total Points",
        chip: chipLabel(picks.active_chip) || undefined,
      },
      lines: [line(1), line(2), line(3), line(4)],
      bench,
    });
  }, [index, entry, picks, fixtures, livePoints, bonus, autoSubsIn, autoSubsOut, shirts, eventInfo, event]);

  if (entryError instanceof FplError && entryError.status === 404) return <EntryNotFound entryId={entryId} />;

  const history = picks?.entry_history;
  const position = gameweeks.indexOf(event ?? -1);
  const newer = position > 0 ? gameweeks[position - 1] : undefined;
  const older = position >= 0 && position < gameweeks.length - 1 ? gameweeks[position + 1] : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={entry ? `${entry.name} · GW${event ?? ""}` : "My Team"}
      markdown={svg ? `![Pitch](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})` : ""}
      metadata={
        entry && history ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Manager" text={`${entry.player_first_name} ${entry.player_last_name}`} />
            <Detail.Metadata.Label title="Overall points" text={formatNumber(history.total_points)} />
            <Detail.Metadata.Label title="Overall rank" text={formatNumber(history.overall_rank)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Team value" text={formatPrice(history.value)} />
            <Detail.Metadata.Label title="In the bank" text={formatPrice(history.bank)} />
            <Detail.Metadata.Label title="Points on bench" text={String(history.points_on_bench)} />
            {index?.nextEvent && event === entry.current_event && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title={`${index.nextEvent.name} deadline`}
                  text={formatDeadline(index.nextEvent.deadline_time)}
                />
              </>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show as List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            target={<TeamView entryId={entryId} initialEvent={event} />}
          />
          <Action.OpenInBrowser title="Open Team on FPL" url={entryUrl(entryId, event)} />
          {older && (
            <Action
              title={`Previous Gameweek (${older})`}
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={() => setEvent(older)}
            />
          )}
          {newer && (
            <Action
              title={`Next Gameweek (${newer})`}
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              onAction={() => setEvent(newer)}
            />
          )}
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}
