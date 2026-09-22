import { formatDay, formatDuration, pluralize, splitDuration } from "./format.ts";
import { UNLABELLED, weeklyTotals, type PeriodRange } from "./stats.ts";
import { CHART_WIDTH, escapeXml, px, rect, svg, text, textWidth, truncateToWidth } from "./svg.ts";
import { dark, posterPalette, SHARE_GRADIENT, tierFor, type PosterPalette, type Theme, type Tier } from "./theme.ts";
import type { Session, Stats } from "./types.ts";

export type WrappedFacts = {
  periodLabel: string;
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  goals: { name: string; minutes: number }[];
  weeks: { start: string; minutes: number }[];
  weeklyAverage: number;
  longestSession: number;
  longestSessionWhen: string;
  bestDay: number;
  bestDayWhen: string;
  bestStreak: number;
  bestStreakWhen: string;
};

export type RecapSource = { stats: Stats; sessions: Session[]; firstOnRecord: number | null };

export function wrappedFacts(
  data: RecapSource,
  range: PeriodRange,
  weekStartsOn: 0 | 1,
  now = new Date(),
): WrappedFacts {
  const { stats } = data;
  const weeks = weeklyTotals(
    data.sessions,
    Math.max(range.from, data.firstOnRecord ?? 0),
    weekStartsOn,
    new Date(Math.min(range.to, now.getTime())),
  );
  const weeklyAverage = weeks.length ? Math.round(weeks.reduce((a, w) => a + w.minutes, 0) / weeks.length) : 0;
  const { bestStreakStart: from, bestStreakEnd: to } = stats;
  return {
    periodLabel: range.label,
    totalMinutes: stats.totalMinutes,
    totalSessions: stats.totalSessions,
    activeDays: stats.activeDays,
    goals: stats.goals.length ? stats.goals : [{ name: UNLABELLED, minutes: 0 }],
    weeks,
    weeklyAverage,
    longestSession: stats.longestSession?.duration ?? 0,
    longestSessionWhen: stats.longestSession ? formatDay(stats.longestSession.start) : "—",
    bestDay: stats.bestDay?.minutes ?? 0,
    bestDayWhen: stats.bestDay ? formatDay(stats.bestDay.date) : "—",
    bestStreak: stats.bestStreak,
    bestStreakWhen:
      from !== null && to !== null
        ? stats.bestStreak > 1
          ? `${formatDay(from)} – ${formatDay(to)}`
          : formatDay(to)
        : "—",
  };
}

type Box = { x: number; y: number; w: number; h: number };

const GUTTER = 8;
const TILE_RADIUS = 10;

const TILE_INSET = 20;

const LEAGUE_INSET = 18;

const HERO_WIDTH = 384;

const ROW_PITCH = 34;

const HERO_GOALS = 77;

const HERO_LABEL = HERO_GOALS - 26;

const HERO_FIGURE = 38;

const GOAL_BAR = 6;

const LADDER_TOP = 76;

const LADDER_PITCH = 26;

const LADDER_LABEL = 86;

const LADDER_COUNT = 26;

const BAR = 10;

export const WRAPPED_HEIGHT = 336;

const TOP_ROW_HEIGHT = 200;
const RECORD_ROW_TOP = 208;
const RECORD_ROW_HEIGHT = 112;

const SHARE_PAD = GUTTER;

export const SHARE_WIDTH = CHART_WIDTH + SHARE_PAD * 2;
export const SHARE_HEIGHT = RECORD_ROW_TOP + RECORD_ROW_HEIGHT + SHARE_PAD * 2;
export const SHARE_ASPECT = SHARE_HEIGHT / SHARE_WIDTH;

export function renderWrapped(facts: WrappedFacts, theme: Theme, tiers: Tier[]): string {
  return svg(CHART_WIDTH, WRAPPED_HEIGHT, theme.font, wrappedBody(facts, theme, tiers));
}

function wrappedBody(facts: WrappedFacts, theme: Theme, tiers: Tier[]): string {
  const width = CHART_WIDTH;
  const poster = posterPalette(theme);

  const hero: Box = { x: 0, y: 0, w: HERO_WIDTH, h: TOP_ROW_HEIGHT };
  const league: Box = {
    x: hero.x + hero.w + GUTTER,
    y: 0,
    w: width - (hero.x + hero.w + GUTTER),
    h: TOP_ROW_HEIGHT,
  };

  return (
    heroTile(facts, hero, poster, theme) +
    leagueTile(facts, tiers, league, poster, theme) +
    recordsRow(facts, { x: 0, y: RECORD_ROW_TOP, w: width, h: RECORD_ROW_HEIGHT }, poster, theme)
  );
}

export function renderSharePoster(facts: WrappedFacts, tiers: Tier[]): string {
  const top = (SHARE_WIDTH - SHARE_HEIGHT) / 2;
  const [from, to] = SHARE_GRADIENT;
  const defs =
    `<linearGradient id="foqus-bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

  const body =
    rect(0, top, SHARE_WIDTH, SHARE_HEIGHT, { fill: "url(#foqus-bg)" }) +
    `<g transform="translate(${SHARE_PAD}, ${px(top + SHARE_PAD)})">${wrappedBody(facts, dark, tiers)}</g>`;

  return svg(SHARE_WIDTH, SHARE_WIDTH, dark.font, body, defs);
}

function tile(box: Box, fill: string, poster: PosterPalette, theme: Theme): string {
  const hairline = theme.name !== "dark" && fill === poster.surface ? theme.border : undefined;
  return rect(box.x, box.y, box.w, box.h, { rx: TILE_RADIUS, fill, stroke: hairline });
}

function heroTile(facts: WrappedFacts, box: Box, poster: PosterPalette, theme: Theme): string {
  const x = box.x + TILE_INSET;
  const top = box.y + TILE_INSET;
  const w = box.w - TILE_INSET * 2;

  let s = tile(box, poster.invertedTile, poster, theme);
  s += heroFigure(x, top, facts.totalMinutes, w, poster.onInverted, poster.onInvertedMuted);
  s +=
    `<text x="${x}" y="${px(top + HERO_LABEL)}" font-size="15" font-weight="600" fill="${poster.onInverted}">${escapeXml(facts.periodLabel)}` +
    `<tspan font-size="12.5" font-weight="500" fill="${poster.onInvertedMuted}">  ·  ${pluralize(facts.totalSessions, "session")} on ${pluralize(facts.activeDays, "day")}</tspan></text>`;

  const goals = facts.goals.slice(0, 3);
  const most = goals[0]?.minutes || 1;
  goals.forEach((g, i) => {
    const y = top + HERO_GOALS + i * ROW_PITCH;
    const hours = formatDuration(g.minutes);
    const name = truncateToWidth(g.name, {
      maxWidth: w - textWidth(hours, 12, 500) - 12,
      fontSize: 12,
      weight: 600,
    });
    s += text(x, y, name, { size: 12, weight: 600, fill: poster.onInverted });
    s += text(x + w, y, hours, { size: 12, weight: 500, fill: poster.onInvertedMuted, anchor: "end" });
    s += rect(x, y + GOAL_BAR, w, GOAL_BAR, { rx: GOAL_BAR / 2, fill: poster.barTrack });
    s += rect(x, y + GOAL_BAR, Math.max(GOAL_BAR, (w * g.minutes) / most), GOAL_BAR, {
      rx: GOAL_BAR / 2,
      fill: poster.onInverted,
    });
  });

  return s;
}

function leagueTile(facts: WrappedFacts, tiers: Tier[], box: Box, poster: PosterPalette, theme: Theme): string {
  const x = box.x + LEAGUE_INSET;
  const y = box.y + LEAGUE_INSET;

  return (
    tile(box, poster.surface, poster, theme) +
    headline(facts, tiers, x, y, poster) +
    tierLadder(facts, tiers, x, y + LADDER_TOP, box.w - LEAGUE_INSET * 2, poster, theme)
  );
}

function headline(facts: WrappedFacts, tiers: Tier[], x: number, y: number, poster: PosterPalette): string {
  const tier = tierFor(facts.weeklyAverage, tiers).tier;
  return (
    text(x, y + 30, `${tier.glyph} ${tier.name}`, { size: 26, weight: 800, fill: poster.ink }) +
    text(x, y + 50, `${formatDuration(facts.weeklyAverage)} a week on average`, {
      size: 13,
      weight: 500,
      fill: poster.ink2,
    })
  );
}

function tierLadder(
  facts: WrappedFacts,
  tiers: Tier[],
  x: number,
  top: number,
  width: number,
  poster: PosterPalette,
  theme: Theme,
): string {
  const held = facts.weeks.filter((week) => week.minutes > 0).map((week) => tierFor(week.minutes, tiers).index);
  const rows = tiers
    .map((tier, index) => ({ tier, index, weeks: held.filter((held) => held === index).length }))
    .filter((row) => row.weeks > 0)
    .reverse();
  if (!rows.length) return "";

  const most = Math.max(...rows.map((row) => row.weeks));
  const barX = x + LADDER_LABEL;
  const barWidth = width - LADDER_LABEL - LADDER_COUNT;

  return rows
    .map(({ tier, index, weeks }, i) => {
      const y = top + i * LADDER_PITCH;
      return (
        text(x, y + 4, tier.glyph, { size: 13, fill: poster.ink }) +
        text(x + 20, y + 4, tier.name, { size: 12, weight: 600, fill: poster.ink2 }) +
        rect(barX, y - BAR / 2, barWidth, BAR, { rx: BAR / 2, fill: theme.track }) +
        rect(barX, y - BAR / 2, Math.max(BAR, (barWidth * weeks) / most), BAR, {
          rx: BAR / 2,
          fill: theme.league[index],
        }) +
        text(x + width, y + 4, String(weeks), { size: 12, weight: 700, fill: poster.ink, anchor: "end" })
      );
    })
    .join("");
}

function recordsRow(facts: WrappedFacts, band: Box, poster: PosterPalette, theme: Theme): string {
  const streak = `${facts.bestStreak} ${facts.bestStreak === 1 ? "day" : "days"}`;
  const records: { value: string; label: string; when: string }[] = [
    { value: facts.bestStreak ? `🔥 ${streak}` : streak, label: "longest streak", when: facts.bestStreakWhen },
    { value: formatDuration(facts.bestDay), label: "best day", when: facts.bestDayWhen },
    { value: formatDuration(facts.longestSession), label: "longest session", when: facts.longestSessionWhen },
  ];

  const tileWidth = (band.w - GUTTER * (records.length - 1)) / records.length;
  const valueSize = 26;

  return records
    .map(({ value, label, when }, i) => {
      const box: Box = {
        x: band.x + i * (tileWidth + GUTTER),
        y: band.y,
        w: tileWidth,
        h: band.h,
      };
      const x = box.x + TILE_INSET;
      const y = box.y + TILE_INSET;
      const fit = (content: string, size: number, weight: number) =>
        truncateToWidth(content, { maxWidth: box.w - TILE_INSET * 2, fontSize: size, weight });
      return (
        tile(box, poster.surface, poster, theme) +
        text(x, y + 20, fit(value, valueSize, 800), { size: valueSize, weight: 800, fill: poster.ink }) +
        text(x, y + 42, fit(label, 13, 500), { size: 13, weight: 500, fill: poster.ink2 }) +
        text(x, y + 62, fit(when, 13, 500), { size: 13, weight: 500, fill: poster.ink2 })
      );
    })
    .join("");
}

function heroFigure(x: number, top: number, minutes: number, maxWidth: number, ink: string, ink2: string): string {
  const { value, unit } = splitDuration(minutes);
  const parts = `${value}${unit}`.split(/([hm])/).filter(Boolean);
  const widthAt = (size: number) =>
    parts.reduce((w, p) => w + textWidth(p, /^[hm]$/.test(p) ? size * 0.4 : size, 800), 0) -
    size * 0.03 * parts.join("").length;
  let size = HERO_FIGURE;
  while (size > 24 && widthAt(size) > maxWidth) size -= 2;
  const unitSize = Math.round(size * 0.4);
  const body = parts
    .map((p) =>
      /^[hm]$/.test(p)
        ? `<tspan font-size="${unitSize}" font-weight="600" fill="${ink2}" letter-spacing="0">${p}</tspan>`
        : escapeXml(p),
    )
    .join("");
  return `<text x="${px(x - 2)}" y="${px(top + size * 0.8)}" font-size="${size}" font-weight="800" fill="${ink}" letter-spacing="${px(-size * 0.03)}">${body}</text>`;
}
