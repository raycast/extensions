// Full-screen match view: an SVG scoreboard (crests, score, state, goals in
// two borderless columns) drawn as one sheet, with a metadata sidebar.
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  environment,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  fetchCrestDataUri,
  fetchMatchDetails,
  leagueLogo,
  leagueUrl,
  matchUrl,
  teamUrl,
  type LineupPlayer,
  type LineupTeam,
  type Match,
  type MatchDayLeague,
  type MatchDetails,
  type MatchEvent,
} from "./fotmob";
import { pairSubstitutions, statusOf } from "./schedule";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const isRed = (e: MatchEvent) =>
  e.type === "Card" && (e.card === "Red" || e.card === "YellowRed");

// "48' Archie Brown", "90+3' Someone (P)", "62' Someone (OG)".
function eventText(e: MatchEvent): string {
  const time = e.overloadTime
    ? `${e.time}+${e.overloadTime}`
    : (e.timeStr ?? e.time);
  const pen = e.isPenalty || e.goalDescriptionKey === "penalty" ? " (P)" : "";
  const own = e.ownGoal ? " (OG)" : "";
  return `${time}' ${e.nameStr ?? ""}${e.type === "Goal" ? pen + own : ""}`;
}

function stateText(m: Match): string {
  switch (statusOf(m)) {
    case "live":
      return `● ${m.status.liveTime?.short ?? "LIVE"}`;
    case "finished":
      return m.status.reason?.short ?? "FT";
    case "cancelled":
      return m.status.reason?.long ?? "Cancelled";
    default:
      return new Date(m.status.utcTime).toLocaleString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });
  }
}

type Block = [svg: string, height: number];
type Theme = { text: string; muted: string; red: string };

const W = 520;
const RED = "#FF3B30";
const HOME = "#2F80ED";
const AWAY = "#F2994A";

function lastName(p: LineupPlayer): string {
  const n = p.lastName || p.name.split(" ").pop() || p.name;
  return n.length > 13 ? `${n.slice(0, 12)}…` : n;
}

function header(
  m: Match,
  crests: { home?: string; away?: string },
  t: Theme,
): Block {
  const CREST = 72;
  const cx = { home: 130, away: 390, mid: 260 };
  const live = statusOf(m) === "live";
  const started = m.status.started || m.status.finished;
  const crest = (uri: string | undefined, x: number) =>
    uri
      ? `<image href="${uri}" x="${x - CREST / 2}" y="16" width="${CREST}" height="${CREST}"/>`
      : `<circle cx="${x}" cy="${16 + CREST / 2}" r="${CREST / 2 - 4}" fill="${t.muted}" opacity="0.25"/>`;
  const parts = [
    crest(crests.home, cx.home),
    crest(crests.away, cx.away),
    `<text x="${cx.mid}" y="66" fill="${t.text}" font-size="40" font-weight="700" text-anchor="middle">${started ? `${m.home.score} – ${m.away.score}` : "vs"}</text>`,
    `<text x="${cx.mid}" y="96" fill="${live ? t.red : t.muted}" font-size="13" font-weight="600" text-anchor="middle">${xml(stateText(m))}</text>`,
    `<text x="${cx.home}" y="114" fill="${t.text}" font-size="14" font-weight="600" text-anchor="middle">${xml(m.home.name)}</text>`,
    `<text x="${cx.away}" y="114" fill="${t.text}" font-size="14" font-weight="600" text-anchor="middle">${xml(m.away.name)}</text>`,
  ];
  return [parts.join(""), 128];
}

const rule = (y: number, t: Theme) =>
  `<line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="${t.muted}" stroke-opacity="0.35"/>`;

// Two borderless columns, home left, away right. Also used for substitutions.
function columns(
  left: string[],
  right: string[],
  y0: number,
  t: Theme,
  size = 13,
): Block {
  const LINE = size + 9;
  const rows = Math.max(left.length, right.length);
  if (rows === 0) return ["", 0];
  const parts = [rule(y0, t)];
  const top = y0 + 24;
  left.forEach((line, i) =>
    parts.push(
      `<text x="46" y="${top + i * LINE}" fill="${t.text}" font-size="${size}">${line}</text>`,
    ),
  );
  right.forEach((line, i) =>
    parts.push(
      `<text x="${W - 46}" y="${top + i * LINE}" fill="${t.text}" font-size="${size}" text-anchor="end">${line}</text>`,
    ),
  );
  return [parts.join(""), 24 + rows * LINE];
}

const dot = (x: number, y: number, fill: string) =>
  `<circle cx="${x}" cy="${y}" r="4" fill="${fill}"/>`;
const card = (x: number, y: number, fill: string) =>
  `<rect x="${x - 4}" y="${y - 5}" width="8" height="11" rx="1.5" fill="${fill}"/>`;

function goals(events: MatchEvent[], y0: number, t: Theme): Block {
  const home = events.filter((e) => e.isHome);
  const away = events.filter((e) => !e.isHome);
  const [svg, h] = columns(
    home.map((e) => xml(eventText(e))),
    away.map((e) => xml(eventText(e))),
    y0,
    t,
  );
  if (!h) return ["", 0];
  // Glyphs sit beside each line; rows are 22px apart from y0 + 24.
  const glyph = (e: MatchEvent, x: number, i: number) =>
    isRed(e)
      ? card(x, y0 + 24 + i * 22 - 9, t.red)
      : dot(x, y0 + 24 + i * 22 - 4, t.text);
  const glyphs = [
    ...home.map((e, i) => glyph(e, 34, i)),
    ...away.map((e, i) => glyph(e, W - 34, i)),
  ];
  return [svg + glyphs.join(""), h];
}

// Horizontal pitch, home attacking right from the left half, away mirrored.
function pitch(
  home: LineupTeam,
  away: LineupTeam,
  y0: number,
  t: Theme,
  dark: boolean,
): Block {
  const PX = 20;
  const PW = W - 2 * PX;
  const PH = 280;
  const py0 = y0 + 30;
  const green = dark ? "#1E5631" : "#3F8F55";
  const lines = "rgba(255,255,255,0.45)";
  const parts = [
    rule(y0, t),
    `<text x="${PX}" y="${y0 + 20}" fill="${t.muted}" font-size="12">${xml(home.name)}${home.formation ? ` · ${home.formation}` : ""}</text>`,
    `<text x="${PX + PW}" y="${y0 + 20}" fill="${t.muted}" font-size="12" text-anchor="end">${xml(away.name)}${away.formation ? ` · ${away.formation}` : ""}</text>`,
    `<rect x="${PX}" y="${py0}" width="${PW}" height="${PH}" rx="8" fill="${green}"/>`,
    `<rect x="${PX + 4}" y="${py0 + 4}" width="${PW - 8}" height="${PH - 8}" rx="6" fill="none" stroke="${lines}"/>`,
    `<line x1="${W / 2}" y1="${py0 + 4}" x2="${W / 2}" y2="${py0 + PH - 4}" stroke="${lines}"/>`,
    `<circle cx="${W / 2}" cy="${py0 + PH / 2}" r="34" fill="none" stroke="${lines}"/>`,
    `<rect x="${PX + 4}" y="${py0 + PH / 2 - 70}" width="66" height="140" fill="none" stroke="${lines}"/>`,
    `<rect x="${PX + PW - 70}" y="${py0 + PH / 2 - 70}" width="66" height="140" fill="none" stroke="${lines}"/>`,
    `<rect x="${PX + 4}" y="${py0 + PH / 2 - 30}" width="24" height="60" fill="none" stroke="${lines}"/>`,
    `<rect x="${PX + PW - 28}" y="${py0 + PH / 2 - 30}" width="24" height="60" fill="none" stroke="${lines}"/>`,
  ];
  const player = (p: LineupPlayer, x: number, y: number, fill: string) => {
    const ev = new Set((p.performance?.events ?? []).map((e) => e.type));
    const out = p.performance?.substitutionEvents?.some(
      (e) => e.type === "subOut",
    );
    parts.push(
      `<circle cx="${x}" cy="${y}" r="12" fill="${fill}" stroke="#fff" stroke-opacity="0.8"/>`,
      `<text x="${x}" y="${y + 4}" fill="#fff" font-size="10.5" font-weight="700" text-anchor="middle">${xml(p.shirtNumber ?? "")}</text>`,
      `<text x="${x}" y="${y + 24}" fill="#fff" font-size="9.5" text-anchor="middle">${xml(lastName(p))}</text>`,
    );
    if (ev.has("goal"))
      parts.push(
        `<circle cx="${x + 10}" cy="${y - 9}" r="4.5" fill="#fff" stroke="#111" stroke-width="1.2"/>`,
      );
    if (ev.has("redCard") || ev.has("yellowRedCard"))
      parts.push(card(x - 11, y - 9, RED));
    else if (ev.has("yellowCard")) parts.push(card(x - 11, y - 9, "#FFCC00"));
    if (out)
      parts.push(
        `<polygon points="${x + 8},${y + 8} ${x + 16},${y + 8} ${x + 12},${y + 14}" fill="${RED}"/>`,
      );
  };
  for (const p of home.starters ?? []) {
    const l = p.horizontalLayout!;
    player(p, PX + (l.x * PW) / 2, py0 + l.y * PH, HOME);
  }
  for (const p of away.starters ?? []) {
    const l = p.horizontalLayout!;
    player(p, PX + PW - (l.x * PW) / 2, py0 + (1 - l.y) * PH, AWAY);
  }
  return [parts.join(""), 30 + PH + 12];
}

// Fallback when FotMob gives a lineup without pitch coordinates.
function teamSheet(team: LineupTeam): string[] {
  const groups = ["GK", "DEF", "MID", "ATT"];
  return groups.flatMap((label, i) => {
    const names = (team.starters ?? [])
      .filter((p) => (p.usualPlayingPositionId ?? -1) === i)
      .map(lastName);
    return names.length ? [`${label}  ${xml(names.join(", "))}`] : [];
  });
}

// "62' ▲ Mercan ▼ Elmaz". `swaps` are this team's Substitution events from
// matchFacts; pairSubstitutions prefers their true [in, out] pairing and
// falls back to unpaired subIn/subOut lines when that data is missing.
function subLines(team: LineupTeam, swaps: MatchEvent[]): string[] {
  const roster = [...(team.starters ?? []), ...(team.subs ?? [])];
  const byId = new Map(roster.map((p) => [String(p.id), p]));
  const swapNames = new Map(
    swaps.flatMap((e) => e.swap?.map((r) => [r.id, r.name] as const) ?? []),
  );
  const name = (id: string) => {
    const p = byId.get(id);
    return p ? lastName(p) : (swapNames.get(id)?.split(" ").pop() ?? "");
  };
  const at = (type: "subIn" | "subOut") =>
    roster.flatMap((p) =>
      (p.performance?.substitutionEvents ?? [])
        .filter((e) => e.type === type)
        .map((e) => ({ time: e.time, id: String(p.id) })),
    );

  return pairSubstitutions(swaps, at("subIn"), at("subOut")).map((line) =>
    "outId" in line
      ? `${line.time}' <tspan fill="#34C759">▲</tspan> ${xml(name(line.inId))} <tspan fill="${RED}">▼</tspan> ${xml(name(line.outId))}`
      : `${line.time}' <tspan fill="${line.direction === "in" ? "#34C759" : RED}">${line.direction === "in" ? "▲" : "▼"}</tspan> ${xml(name(line.id))}`,
  );
}

// FotMob-style rating pills: 9+ blue, 7–8.9 green, 6–6.9 orange, below red.
const ratingColor = (r: number) =>
  r >= 9 ? "#0A84FF" : r >= 7 ? "#34C759" : r >= 6 ? "#FF9F0A" : "#FF453A";

type Rated = { name: string; rating: number; goals: number; assists: number };

function rated(team: LineupTeam): Rated[] {
  return [...(team.starters ?? []), ...(team.subs ?? [])]
    .flatMap((p): Rated[] => {
      const r = p.performance?.rating;
      if (typeof r !== "number") return [];
      const types = (p.performance?.events ?? []).map((e) => e.type);
      return [
        {
          name: lastName(p),
          rating: r,
          goals: types.filter((t) => t === "goal").length,
          assists: types.filter((t) => t === "assist").length,
        },
      ];
    })
    .sort((a, b) => b.rating - a.rating);
}

// Small goal ball and assist boot, drawn at (x, y) = left edge, text baseline.
const ball = (x: number, y: number) =>
  `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="#fff" stroke="#111" stroke-width="1.2"/>` +
  `<circle cx="${x + 5}" cy="${y - 4}" r="1.6" fill="#111"/>`;
const boot = (x: number, y: number, fill: string) =>
  `<path d="M${x + 1},${y - 9} h4 v4 l5,2 v3 h-10 z" fill="${fill}"/>`;

function ratings(
  home: LineupTeam,
  away: LineupTeam,
  y0: number,
  t: Theme,
): Block {
  const l = rated(home);
  const r = rated(away);
  const rows = Math.max(l.length, r.length);
  if (rows === 0) return ["", 0];
  const LINE = 24;
  const top = y0 + 26;
  const parts = [rule(y0, t)];
  // ponytail: 12px SF text averages ~6.4px/char; icons trail the name by estimate.
  const CHAR = 6.7;
  // dir 1 draws rightwards from x, -1 leftwards (mirrored away column).
  const marks = (p: Rated, x: number, y: number, dir: 1 | -1) => {
    let out = "";
    let cx = dir === 1 ? x : x - 11;
    for (let i = 0; i < p.goals; i++, cx += 13 * dir) out += ball(cx, y);
    for (let i = 0; i < p.assists; i++, cx += 13 * dir)
      out += boot(cx, y, t.muted);
    return out;
  };
  const pill = (x: number, y: number, rating: number) =>
    `<rect x="${x - 17}" y="${y - 13}" width="34" height="18" rx="5" fill="${ratingColor(rating)}"/>` +
    `<text x="${x}" y="${y}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${rating.toFixed(1)}</text>`;
  l.forEach((p, i) => {
    const y = top + i * LINE;
    parts.push(
      pill(63, y, p.rating),
      `<text x="88" y="${y}" fill="${t.text}" font-size="12">${xml(p.name)}</text>`,
      marks(p, 88 + p.name.length * CHAR + 9, y, 1),
    );
  });
  r.forEach((p, i) => {
    const y = top + i * LINE;
    parts.push(
      pill(W - 63, y, p.rating),
      `<text x="${W - 88}" y="${y}" fill="${t.text}" font-size="12" text-anchor="end">${xml(p.name)}</text>`,
      marks(p, W - 88 - p.name.length * CHAR - 9, y, -1),
    );
  });
  return [parts.join(""), 26 + rows * LINE];
}

function scoreboard(
  m: Match,
  details: MatchDetails | undefined,
  events: MatchEvent[],
  subs: MatchEvent[],
  crests: { home?: string; away?: string },
): string {
  const dark = environment.appearance === "dark";
  const t: Theme = {
    text: dark ? "#ffffff" : "#1c1c1e",
    muted: dark ? "#9a9aa0" : "#6e6e73",
    red: RED,
  };
  const blocks: Block[] = [header(m, crests, t)];
  let y = blocks[0][1];
  const push = (b: Block) => {
    blocks.push(b);
    y += b[1];
  };
  push(goals(events, y, t));

  const lineup = details?.content?.lineup;
  const home = lineup?.homeTeam;
  const away = lineup?.awayTeam;
  if (home?.starters?.length && away?.starters?.length) {
    const placed = [...home.starters, ...away.starters].every(
      (p) => p.horizontalLayout,
    );
    push(
      placed
        ? pitch(home, away, y, t, dark)
        : columns(teamSheet(home), teamSheet(away), y, t, 12),
    );
    push(
      columns(
        subLines(
          home,
          subs.filter((e) => e.isHome),
        ),
        subLines(
          away,
          subs.filter((e) => !e.isHome),
        ),
        y,
        t,
        12,
      ),
    );
    push(ratings(home, away, y, t));
  }

  const H = y + 4;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Helvetica,sans-serif">` +
    blocks.map((b) => b[0]).join("") +
    `</svg>`;
  return `![](data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")})`;
}

const STAT_LABELS: Record<string, string> = {
  BallPossesion: "Possession",
  expected_goals: "xG",
  total_shots: "Shots",
  ShotsOnTarget: "On target",
  big_chance: "Big chances",
  corners: "Corners",
};

// "Top stats" is group 0; FotMob's own order already matches STAT_LABELS.
function topStats(details: MatchDetails | undefined): [string, string][] {
  const entries =
    details?.content?.stats?.Periods?.All?.stats?.[0]?.stats ?? [];
  return entries.flatMap((s): [string, string][] => {
    const label = STAT_LABELS[s.key];
    if (!label || s.stats?.length !== 2) return [];
    const unit = s.key === "BallPossesion" ? "%" : "";
    return [[label, `${s.stats[0]}${unit} – ${s.stats[1]}${unit}`]];
  });
}

// Live score/status come from the details header once loaded; the day feed
// snapshot the row was pushed with is the fallback.
function merge(initial: Match, details: MatchDetails | undefined): Match {
  const h = details?.header;
  if (!h?.status) return initial;
  return {
    ...initial,
    status: h.status,
    home: { ...initial.home, score: h.teams?.[0]?.score ?? initial.home.score },
    away: { ...initial.away, score: h.teams?.[1]?.score ?? initial.away.score },
  };
}

async function load(id: number, homeId: number, awayId: number) {
  const crest = (teamId: number) =>
    fetchCrestDataUri(teamId).catch(() => undefined);
  const [details, home, away] = await Promise.all([
    fetchMatchDetails(id),
    crest(homeId),
    crest(awayId),
  ]);
  return { details, crests: { home, away } };
}

export function MatchDetailView({
  match: initial,
  league,
}: {
  match: Match;
  league: MatchDayLeague;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(
    load,
    [initial.id, initial.home.id, initial.away.id],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load match details" });
      },
    },
  );
  const details = data?.details;
  const match = merge(initial, details);
  const live = statusOf(match) === "live";

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(revalidate, 60_000);
    return () => clearInterval(timer);
  }, [live, revalidate]);

  const rawEvents = details?.content?.matchFacts?.events?.events ?? [];
  const events = rawEvents
    .filter((e) => e.type === "Goal" || isRed(e))
    .sort((a, b) => a.time - b.time);
  const subs = rawEvents.filter((e) => e.type === "Substitution");
  const info = details?.content?.matchFacts?.infoBox;
  const tournament = info?.Tournament;
  const stadium = info?.Stadium;
  const referee = info?.Referee?.text;
  const attendance = info?.Attendance;
  const competition = tournament?.leagueName ?? league.name;
  const stats = topStats(details);
  const Label = Detail.Metadata.Label;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${match.home.name} vs ${match.away.name}`}
      markdown={scoreboard(match, details, events, subs, data?.crests ?? {})}
      metadata={
        <Detail.Metadata>
          <Label
            title="Kickoff"
            text={new Date(match.status.utcTime).toLocaleString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          />
          <Label
            title="Competition"
            icon={leagueLogo(
              tournament?.parentLeagueId ??
                league.parentLeagueId ??
                league.primaryId,
            )}
            text={
              tournament?.roundName
                ? `${competition} · Round ${tournament.roundName}`
                : competition
            }
          />
          {stadium?.name ? (
            <Label
              title="Stadium"
              text={
                stadium.city ? `${stadium.name}, ${stadium.city}` : stadium.name
              }
            />
          ) : null}
          {referee ? <Label title="Referee" text={referee} /> : null}
          {attendance ? (
            <Label title="Attendance" text={attendance.toLocaleString()} />
          ) : null}
          {stats.length > 0 ? <Detail.Metadata.Separator /> : null}
          {stats.map(([title, text]) => (
            <Label key={title} title={title} text={text} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in FotMob"
            url={matchUrl(match.id)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open League in FotMob"
              url={leagueUrl(league.primaryId)}
            />
            <Action.OpenInBrowser
              title={`Open ${match.home.name} in FotMob`}
              url={teamUrl(match.home.id)}
            />
            <Action.OpenInBrowser
              title={`Open ${match.away.name} in FotMob`}
              url={teamUrl(match.away.id)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
