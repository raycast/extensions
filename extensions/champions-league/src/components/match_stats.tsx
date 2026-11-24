import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import json2md from "json2md";
import { getMatchTeamStats } from "../api";
import { Match } from "../types";
import { matchTitle, statValue, teamName } from "../utils";
import MatchActions from "./match_actions";

const STATS: { name: string; label: string; unit?: string }[] = [
  { name: "ball_possession", label: "Possession", unit: "%" },
  { name: "attempts", label: "Total attempts" },
  { name: "attempts_on_target", label: "On target" },
  { name: "attempts_off_target", label: "Off target" },
  { name: "attempts_blocked", label: "Blocked" },
  { name: "corners", label: "Corners" },
  { name: "offsides", label: "Offsides" },
  { name: "saves", label: "Saves" },
  { name: "passes_completed", label: "Passes completed" },
  { name: "passes_accuracy", label: "Passing accuracy", unit: "%" },
  { name: "distance_covered", label: "Distance covered", unit: " km" },
  { name: "tackles", label: "Tackles" },
  { name: "fouls_committed", label: "Fouls committed" },
  { name: "yellow_cards", label: "Yellow cards" },
  { name: "red_cards", label: "Red cards" },
];

const bar = (home: number, away: number) => {
  const total = home + away;
  if (!total) return "";
  const width = 20;
  const left = Math.round((home / total) * width);
  return `${"█".repeat(left)}${"░".repeat(width - left)}`;
};

export default function MatchStats({ match }: { match: Match }) {
  const { data = [], isLoading } = useCachedPromise(getMatchTeamStats, [
    match.id,
  ]);

  const home = data.find((d) => d.teamId === match.homeTeam.id)?.statistics;
  const away = data.find((d) => d.teamId === match.awayTeam.id)?.statistics;

  const rows = STATS.map(({ name, label, unit = "" }) => {
    const h = statValue(home, name);
    const a = statValue(away, name);
    if (h === undefined && a === undefined) return undefined;
    const hv = Number(h ?? 0);
    const av = Number(a ?? 0);
    const fmt = (v: number) =>
      `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
    return [fmt(hv), label, fmt(av), "`" + bar(hv, av) + "`"];
  }).filter((r): r is string[] => Boolean(r));

  const markdown =
    rows.length > 0
      ? json2md([
          { h2: matchTitle(match) },
          {
            table: {
              headers: [
                teamName(match.homeTeam),
                "",
                teamName(match.awayTeam),
                "",
              ],
              rows,
            },
          },
        ])
      : isLoading
        ? ""
        : "## No statistics available for this match yet.";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${matchTitle(match)} | Stats`}
      markdown={markdown}
      actions={<MatchActions match={match} />}
    />
  );
}
