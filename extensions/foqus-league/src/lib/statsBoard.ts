import { formatDuration, pluralize } from "./format.ts";
import { dateOfDayKey } from "./streaks.ts";
import { CHART_WIDTH, luminance, px, rect, svg, text, type TextOpts } from "./svg.ts";
import { tierFor, type Theme, type Tier } from "./theme.ts";
import type { Stats } from "./types.ts";

const PAD = 2;
const SECTION_GAP = 8;
const INSET = 3;
const TICK_HALF = 5;
const TICK_GAP = 6;
const TICK_RISE = 3.88;

type Band = { body: string; height: number };

const inkOn = (theme: Theme, fill: string) => (luminance(fill) > 0.28 ? theme.onDark : "#ffffff");

function shieldPath(cx: number, cy: number, fill: string): string {
  const d = `M${px(cx - 6.7)},${px(cy - 8.3)} h13.4 v8.3 q0,5.4 -6.7,8.3 q-6.7,-2.9 -6.7,-8.3 z`;
  return `<path d="${d}" fill="${fill}" />`;
}

function checkPath(cx: number, cy: number, stroke: string): string {
  const d = `M${px(cx - 4)},${px(cy)} l3,3 l5,-6`;
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />`;
}

function hourLabel(minutes: number): string {
  return `${Math.round(minutes / 60)}h`;
}

function minutesLabel(minutes: number): string {
  return minutes < 60 ? String(minutes) : hourLabel(minutes);
}

function cellLabel(day: { minutes: number }): string {
  return day.minutes ? minutesLabel(day.minutes) : "";
}

function calendarBody(stats: Stats, theme: Theme, tiers: Tier[], width: number): Band {
  const CELL_GAP = 4;
  const gutter = 30;
  const gridX = PAD + gutter;
  const gridY = 26;

  const weeks: Stats["days"][] = [];
  for (let i = 0; i < stats.days.length; i += 7) weeks.push(stats.days.slice(i, i + 7));

  const available = width - PAD * 2 - gutter;
  const cell = Math.max(6, Math.min(48, (available + CELL_GAP) / Math.max(1, weeks.length) - CELL_GAP));
  const pitch = cell + CELL_GAP;
  const gridH = 7 * pitch - CELL_GAP;
  const labelled = cell >= 18;
  const fontSize = Math.max(8, Math.min(13, Math.round(cell * 0.46)));

  const H = gridY + gridH + 2 + cell;
  let out = "";

  let lastMonth = "";
  weeks.forEach((week, i) => {
    const first = week[0];
    if (!first) return;
    const d = dateOfDayKey(first.date);
    const month = d.toLocaleDateString(undefined, { month: "short" });
    if (d.getDate() <= 7 && month !== lastMonth) {
      out += text(gridX + i * pitch, gridY - 8, month, { size: 11, weight: 500, fill: theme.muted });
      lastMonth = month;
    }
  });

  const firstDate = stats.days[0] ? dateOfDayKey(stats.days[0].date) : new Date();
  for (let row = 0; row < 7; row++) {
    const d = new Date(firstDate);
    d.setDate(d.getDate() + row);
    out += text(gridX - 8, gridY + row * pitch + cell / 2 + 4, d.toLocaleDateString(undefined, { weekday: "short" }), {
      size: 10,
      weight: 500,
      fill: theme.muted,
      anchor: "end",
    });
  }

  weeks.forEach((week, col) => {
    week.forEach((day, row) => {
      const x = gridX + col * pitch;
      const y = gridY + row * pitch;
      const fill = theme.heat[day.level];
      out += rect(x, y, cell, cell, { rx: Math.min(4, cell / 4), fill });
      if (!labelled) return;
      const value = cellLabel(day);
      if (!value) return;
      out += text(x + cell / 2, y + cell / 2 + fontSize * 0.36, value, {
        size: fontSize,
        weight: 600,
        fill: inkOn(theme, fill),
        anchor: "middle",
      });
    });
  });

  const wkY = gridY + 7 * pitch + 2;
  out += text(gridX - 8, wkY + cell / 2 + 4, "Wk", { size: 10, weight: 500, fill: theme.muted, anchor: "end" });
  weeks.forEach((week, col) => {
    const minutes = week.reduce((a, d) => a + d.minutes, 0);
    const x = gridX + col * pitch + cell / 2;
    if (!minutes) {
      out += text(x, wkY + cell / 2 + 4, "·", { size: 12, fill: theme.muted, anchor: "middle" });
      return;
    }
    out += text(x, wkY + cell / 2 + fontSize * 0.36, minutesLabel(minutes), {
      size: fontSize,
      weight: 700,
      fill: theme.league[tierFor(minutes, tiers).index],
      anchor: "middle",
    });
  });

  return { body: out, height: H };
}

function label(theme: Theme, x: number, y: number, content: string, o: Partial<TextOpts> = {}): string {
  return text(x, y, content.toUpperCase(), { size: 10, weight: 600, fill: theme.muted, spacing: 1, ...o });
}

function figure(theme: Theme, x: number, y: number, numeral: string, caption: string, anchor: "start" | "end"): string {
  const num = `<tspan font-size="20" font-weight="700" letter-spacing="0" fill="${theme.ink}">${numeral}</tspan>`;
  const caps = `<tspan font-size="10" font-weight="600" letter-spacing="1" fill="${theme.muted}">${caption}</tspan>`;
  const [first, second] = anchor === "start" ? [num, caps] : [caps, num];
  return `<text x="${px(x)}" y="${px(y)}"${anchor === "end" ? ' text-anchor="end"' : ""}>${first}${second.replace("<tspan", '<tspan dx="6"')}</text>`;
}
function statBlock(
  theme: Theme,
  x: number,
  baseline: number,
  { name, value, sub }: { name: string; value: string; sub: string },
): string {
  return (
    label(theme, x, baseline, name) +
    text(x, baseline + 32, value, { size: 30, weight: 700, fill: theme.ink }) +
    text(x, baseline + 50, sub, { size: 12, fill: theme.ink2 })
  );
}

function meter(theme: Theme, x: number, y: number, w: number, progress: number): string {
  return (
    rect(x, y, w, 6, { rx: 3, fill: theme.track }) +
    (progress > 0 ? rect(x, y, Math.max(6, w * Math.min(1, progress)), 6, { rx: 3, fill: theme.accent }) : "")
  );
}

function statsRow(stats: Stats, theme: Theme, tier: Tier, baseline: number): string {
  const today = stats.days[stats.days.length - 1];
  return (
    statBlock(theme, PAD, baseline, {
      name: "Today",
      value: formatDuration(stats.todayMinutes),
      sub: pluralize(today?.sessions ?? 0, "session"),
    }) +
    statBlock(theme, PAD + 150, baseline, {
      name: "This week",
      value: formatDuration(stats.weekMinutes),
      sub: `${tier.glyph} ${tier.name} league`,
    })
  );
}

function streakChain(stats: Stats, theme: Theme, width: number, baseline: number): string {
  const inkOnAccent = inkOn(theme, theme.accent);
  const r = 9;
  const pitch = 27;
  const chain = stats.days.slice(-14);
  const x0 = width - PAD - (2 * r + 13 * pitch);
  const cy = baseline + 26;

  const headY = baseline + 8;
  let out = stats.currentStreak
    ? figure(theme, x0, headY, `🔥 ${stats.currentStreak}`, "DAY STREAK", "start")
    : label(theme, x0, headY, "No streak yet");
  if (stats.bestStreak > stats.currentStreak) {
    out += figure(theme, width - PAD, headY, String(stats.bestStreak), "BEST", "end");
  }

  chain.forEach((day, i) => {
    const cx = x0 + r + i * pitch;
    const on = day.minutes > 0;
    const shielded = !on && day.shielded;
    const isToday = i === chain.length - 1;
    if (shielded) {
      out += shieldPath(cx, cy, theme.accent);
    } else {
      out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${on ? theme.accent : theme.track}"${
        isToday ? ` stroke="${theme.muted}" stroke-width="2"` : ""
      } />`;
      if (on) {
        out += checkPath(cx, cy, inkOnAccent);
      }
    }
    const d = dateOfDayKey(day.date);
    out += text(cx, cy + r + 15, d.toLocaleDateString(undefined, { weekday: "narrow" }), {
      size: 9,
      weight: 500,
      fill: isToday ? theme.ink : theme.muted,
      anchor: "middle",
    });
  });

  return out;
}

type Quest = { title: string; sub: string; progress: number; done: boolean };

function questRow(quest: Quest, theme: Theme, x: number, w: number, titleBaseline: number): string {
  const subBaseline = titleBaseline - 1;
  let out = text(x, titleBaseline, quest.title, { size: 13, weight: 600, fill: theme.ink });
  if (quest.done) {
    const cx = x + w - TICK_HALF;
    out += text(cx - TICK_HALF - TICK_GAP, subBaseline, quest.sub, { size: 11, fill: theme.goodText, anchor: "end" });
    out += checkPath(cx, subBaseline - TICK_RISE, theme.goodText);
  } else {
    out += text(x + w, subBaseline, quest.sub, { size: 11, fill: theme.ink2, anchor: "end" });
  }
  return out + meter(theme, x, titleBaseline + 8, w, quest.progress);
}

function momentumBody(stats: Stats, theme: Theme, dailyGoal: number, tiers: Tier[], width: number): Band {
  const { tier, next } = tierFor(stats.weekMinutes, tiers);
  const progress = next ? (stats.weekMinutes - tier.min) / (next.min - tier.min) : 1;
  const lastWeek = stats.lastWeekMinutes;
  const delta = stats.weekMinutes - lastWeek;
  const thisWeek = stats.days.slice(-(((stats.days.length - 1) % 7) + 1));
  const hit = thisWeek.filter((d) => d.minutes >= dailyGoal).length;

  const statBaseline = INSET + 7;
  let out = statsRow(stats, theme, tier, statBaseline);
  out += streakChain(stats, theme, width, statBaseline);

  const questTitleBaseline = statBaseline + 50 + SECTION_GAP * 2 + 14;
  const quests: Quest[] = [
    {
      title: next ? `Reach ${next.glyph} ${next.name}` : "Top league",
      sub: next ? `${formatDuration(next.min - stats.weekMinutes)} to go` : `${tier.glyph} ${tier.name}`,
      progress,
      done: !next,
    },
    {
      title: "Perfect week",
      sub: `${Math.min(hit, 5)} of 5 days at ${formatDuration(dailyGoal)}`,
      progress: hit / 5,
      done: hit >= 5,
    },
    {
      title: "Beat last week",
      sub: delta > 0 ? `+${formatDuration(delta)}` : `${formatDuration(1 - delta)} to go`,
      progress: lastWeek ? stats.weekMinutes / lastWeek : stats.weekMinutes ? 1 : 0,
      done: delta > 0,
    },
  ];

  const gutter = 24;
  const questWidth = (width - PAD * 2 - gutter * (quests.length - 1)) / quests.length;
  quests.forEach((quest, i) => {
    out += questRow(quest, theme, PAD + i * (questWidth + gutter), questWidth, questTitleBaseline);
  });

  return { body: out, height: questTitleBaseline + 14 };
}

export function renderBoard(
  stats: Stats,
  theme: Theme,
  dailyGoal: number,
  tiers: Tier[],
  width: number = CHART_WIDTH,
): string {
  const m = momentumBody(stats, theme, dailyGoal, tiers, width);
  const c = calendarBody(stats, theme, tiers, width);
  const calY = m.height + SECTION_GAP;
  const body = m.body + `<g transform="translate(0 ${calY})">${c.body}</g>`;
  return svg(width, calY + c.height, theme.font, body);
}
