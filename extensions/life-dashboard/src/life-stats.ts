// Pure calculations behind Life Dashboard.
// Fun-stat assumptions: 8h sleep/night, 3 meals/day, 1 shower/day,
// 80 heartbeats/min, 16 breaths/min, lunar cycle 29.53 days.
// Seasons use northern-hemisphere meteorological starts (Mar/Jun/Sep/Dec 1).
// Ramadans & lunar years use the Umm al-Qura Islamic calendar via Intl.

const DAY = 24 * 3600 * 1000;

export interface LifeInput {
  birthday: Date;
  workStart?: Date;
  deathAge: number;
  paycheckCadence: "monthly" | "biweekly";
  weekStart: number; // 0 = Sunday … 6 = Saturday
}

export interface Milestone {
  emoji: string;
  title: string;
  date: Date;
  passed: boolean;
  /** days from now (negative if passed) */
  inDays: number;
}

export interface LifeStats {
  ageYears: number;
  daysLived: number;
  weeksLived: number;
  monthsLived: number;
  lifePct: number;
  deathDate: Date;
  deathYear: number;
  totalWeeks: number;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  yearsRemaining: number;
  daysLeftThisWeek: number;
  weeksLeftThisYear: number;
  monthsLeftThisYear: number;
  birthdays: number;
  newYears: number;
  weekends: number;
  daysSlept: number;
  meals: number;
  showers: number;
  heartbeats: number;
  breaths: number;
  fullMoons: number;
  summers: number;
  winters: number;
  springs: number;
  autumns: number;
  christmases: number;
  ramadans: number;
  lunarYears: number;
  paychecks?: number;
  daysWorked?: number;
  milestones: Milestone[];
}

function addYears(d: Date, years: number): Date {
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + years);
  return out;
}

/** Occurrences of an annual moment (given month index/day) up to `d`. */
function annualCount(d: Date, monthIdx: number, day = 1): number {
  const reached = d.getMonth() > monthIdx || (d.getMonth() === monthIdx && d.getDate() >= day);
  return d.getFullYear() + (reached ? 1 : 0);
}

const hijri = (d: Date, part: "year" | "month"): number => {
  try {
    const v = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      [part]: "numeric",
    }).format(d);
    return parseInt(v.replace(/\D/g, ""), 10);
  } catch {
    return NaN;
  }
};

/** Ramadans started up to `d` (relative index; diff two of these). */
function ramadanIndex(d: Date): number {
  const y = hijri(d, "year");
  const m = hijri(d, "month");
  if (!Number.isFinite(y) || !Number.isFinite(m)) return NaN;
  return y + (m >= 9 ? 1 : 0);
}

export function computeLifeStats(input: LifeInput, now = new Date()): LifeStats {
  const { birthday, workStart, deathAge, paycheckCadence, weekStart } = input;
  const daysLived = Math.max(0, Math.floor((now.getTime() - birthday.getTime()) / DAY));
  const deathDate = addYears(birthday, deathAge);
  const totalDays = Math.max(1, Math.floor((deathDate.getTime() - birthday.getTime()) / DAY));
  const daysRemaining = Math.max(0, totalDays - daysLived);

  let ageYears = now.getFullYear() - birthday.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birthday.getMonth() ||
    (now.getMonth() === birthday.getMonth() && now.getDate() >= birthday.getDate());
  if (!hadBirthdayThisYear) ageYears--;

  const monthsLived =
    (now.getFullYear() - birthday.getFullYear()) * 12 +
    (now.getMonth() - birthday.getMonth()) -
    (now.getDate() < birthday.getDate() ? 1 : 0);

  const weekEndIdx = (weekStart + 6) % 7;
  const daysLeftThisWeek = (weekEndIdx - now.getDay() + 7) % 7;
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysLeftThisYear = Math.floor((endOfYear.getTime() - now.getTime()) / DAY);

  const ram = ramadanIndex(now) - ramadanIndex(birthday);
  const hijriYears = hijri(now, "year") - hijri(birthday, "year");

  const stats: LifeStats = {
    ageYears,
    daysLived,
    weeksLived: Math.floor(daysLived / 7),
    monthsLived: Math.max(0, monthsLived),
    lifePct: Math.min(100, (daysLived / totalDays) * 100),
    deathDate,
    deathYear: deathDate.getFullYear(),
    totalWeeks: Math.floor(totalDays / 7),
    daysRemaining,
    weeksRemaining: Math.floor(daysRemaining / 7),
    monthsRemaining: Math.floor(daysRemaining / 30.44),
    yearsRemaining: Math.max(0, deathAge - ageYears),
    daysLeftThisWeek,
    weeksLeftThisYear: Math.floor(daysLeftThisYear / 7),
    monthsLeftThisYear: 11 - now.getMonth(),
    birthdays: Math.max(0, ageYears),
    newYears: Math.max(0, now.getFullYear() - birthday.getFullYear()),
    weekends: Math.floor(daysLived / 7),
    daysSlept: Math.round(daysLived / 3),
    meals: daysLived * 3,
    showers: daysLived,
    heartbeats: daysLived * 24 * 60 * 80,
    breaths: daysLived * 24 * 60 * 16,
    fullMoons: Math.floor(daysLived / 29.53),
    springs: annualCount(now, 2) - annualCount(birthday, 2),
    summers: annualCount(now, 5) - annualCount(birthday, 5),
    autumns: annualCount(now, 8) - annualCount(birthday, 8),
    winters: annualCount(now, 11) - annualCount(birthday, 11),
    christmases: annualCount(now, 11, 25) - annualCount(birthday, 11, 25),
    ramadans: Number.isFinite(ram) ? Math.max(0, ram) : 0,
    lunarYears: Number.isFinite(hijriYears) ? Math.max(0, hijriYears) : 0,
    milestones: [],
  };

  if (workStart && workStart.getTime() < now.getTime()) {
    const daysWorked = Math.floor((now.getTime() - workStart.getTime()) / DAY);
    stats.daysWorked = daysWorked;
    stats.paychecks =
      paycheckCadence === "biweekly"
        ? Math.floor(daysWorked / 14)
        : (now.getFullYear() - workStart.getFullYear()) * 12 +
          (now.getMonth() - workStart.getMonth()) -
          (now.getDate() < workStart.getDate() ? 1 : 0);
  }

  const mk = (emoji: string, title: string, date: Date): Milestone => ({
    emoji,
    title,
    date,
    passed: date.getTime() <= now.getTime(),
    inDays: Math.ceil((date.getTime() - now.getTime()) / DAY),
  });
  const decadeMilestones = [20, 30, 40, 50, 60, 70, 80, 90]
    .filter((y) => y <= Math.max(deathAge, 90))
    .map((y) => mk("🎂", `The ${Math.floor(y / 10)}-0 birthday`, addYears(birthday, y)));
  stats.milestones = [
    mk("🎓", "High school graduation (~18)", addYears(birthday, 18)),
    mk("🎓", "College graduation (~22)", addYears(birthday, 22)),
    mk("🔟", "10,000 days alive", new Date(birthday.getTime() + 10000 * DAY)),
    mk("✨", "20,000 days alive", new Date(birthday.getTime() + 20000 * DAY)),
    mk("⏳", "Halfway point", addYears(birthday, Math.round(deathAge / 2))),
    mk("🏖️", "Retirement (~65)", addYears(birthday, 65)),
    ...decadeMilestones,
    mk("👋", `The expected farewell (${deathAge})`, deathDate),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return stats;
}

export function progressBar(pct: number, symbol = "■", length = 20): string {
  const filled = Math.round((pct / 100) * length);
  return symbol.repeat(filled).padEnd(length, "·") + ` ${pct.toFixed(1)}%`;
}

export const fmt = (n: number): string => n.toLocaleString("en-US");

export const compactNum = (n: number): string =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The manifest-generated preference type (raycast-env.d.ts), so the manifest
 *  and source typing can't drift. */
export type RawPrefs = ExtensionPreferences;

/** Parse the extension preferences into a LifeInput (undefined = birthday missing/invalid). */
export function parseLifeInput(p: RawPrefs): LifeInput | undefined {
  const birthday = parseDate(p.birthday);
  if (!birthday) return undefined;
  const deathAgeRaw = parseInt(p.deathAge ?? "80", 10);
  const deathAge = Math.min(120, Math.max(50, Number.isFinite(deathAgeRaw) ? deathAgeRaw : 80));
  return {
    birthday,
    workStart: parseDate(p.workStartDate),
    deathAge,
    paycheckCadence: p.paycheckCadence === "biweekly" ? "biweekly" : "monthly",
    weekStart: Math.max(0, WEEKDAYS.indexOf(p.weekStart ?? "Sunday")),
  };
}

function parseDate(s?: string): Date | undefined {
  // Construct in local time: Date.parse("1995-01-01") yields UTC midnight,
  // which local calendar getters read as the previous day west of UTC.
  const match = s?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  if (d.getFullYear() !== Number(year) || d.getMonth() !== Number(month) - 1 || d.getDate() !== Number(day)) {
    return undefined;
  }
  return d.getTime() < Date.now() ? d : undefined;
}

/** Life-in-weeks grid rendered as an SVG data URI: one row per year,
 *  52 squares per row, colored by life stage — crisp and full-width. */
export function lifeGridSvgUri(input: LifeInput, now = new Date()): string {
  const { birthday, deathAge } = input;
  const weeksLived = Math.max(0, Math.floor((now.getTime() - birthday.getTime()) / (7 * DAY)));
  const stageColor = (year: number): string => {
    if (year < 13) return "#4A90D9";
    if (year < 20) return "#3CB371";
    if (year < 40) return "#F5C242";
    if (year < 60) return "#F58A33";
    return "#E14B4B";
  };
  const cell = 10;
  const gap = 2;
  const labelW = 26;
  const cols = 52;
  const legendH = 22;
  const width = labelW + cols * (cell + gap);
  const height = legendH + deathAge * (cell + gap) + 4;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
  ];
  // legend strip above the grid, exact swatch colors
  const legend: Array<[string, string, number]> = [
    ["#4A90D9", "childhood", 1],
    ["#3CB371", "teens", 1],
    ["#F5C242", "20s–30s", 1],
    ["#F58A33", "40s–50s", 1],
    ["#E14B4B", "60+", 1],
    ["#9AA0A6", "ahead", 0.28],
  ];
  let lx = labelW;
  for (const [color, label, op] of legend) {
    parts.push(`<rect x="${lx}" y="4" width="10" height="10" rx="2" fill="${color}" fill-opacity="${op}"/>`);
    parts.push(
      `<text x="${lx + 14}" y="13" font-family="Menlo,monospace" font-size="9" fill="#8E8E93">${label}</text>`,
    );
    lx += 14 + label.length * 5.6 + 16;
  }
  parts.push(
    `<rect x="${lx}" y="4" width="10" height="10" rx="2" fill="#FFFFFF" stroke="#E14B4B" stroke-width="1.5"/>`,
    `<text x="${lx + 14}" y="13" font-family="Menlo,monospace" font-size="9" fill="#8E8E93">this week</text>`,
  );
  for (let year = 0; year < deathAge; year++) {
    const y = legendH + year * (cell + gap) + 2;
    if (year % 10 === 0) {
      parts.push(
        `<text x="0" y="${y + cell - 1}" font-family="Menlo,monospace" font-size="9" fill="#8E8E93">${year}</text>`,
      );
    }
    for (let week = 0; week < cols; week++) {
      const idx = year * cols + week;
      const x = labelW + week * (cell + gap);
      const isNow = idx === weeksLived;
      const fill = idx < weeksLived ? stageColor(year) : isNow ? "#FFFFFF" : "#9AA0A6";
      const opacity = idx < weeksLived || isNow ? "1" : "0.28";
      parts.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fill}" fill-opacity="${opacity}"${
          isNow ? ` stroke="#E14B4B" stroke-width="1.5"` : ""
        }/>`,
      );
    }
  }
  parts.push("</svg>");
  const svg = parts.join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
