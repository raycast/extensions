import {
  formatJalaliDateTime,
  jalaaliToDate,
  toAsciiDigits,
  dateToJalaali,
  JALALI_MONTHS,
} from "./jalali";

/** A task description typed in free-form Persian (or English) text. */
export interface ParsedTaskText {
  /** The task title with the date/time fragments removed. */
  title: string;
  /** Resolved due date/time, or null when no date was understood. */
  date: Date | null;
  /** True when the text contained an explicit clock time. */
  hasTime: boolean;
  /** The raw fragments that were consumed (used for the live preview). */
  matched: string[];
  /** Human readable notes about how the text was interpreted. */
  notes: string[];
}

interface Span {
  start: number;
  end: number;
  text: string;
  note?: string;
}

const WEEKDAYS: { pattern: string; day: number }[] = [
  { pattern: "یک\\s?شنبه", day: 0 },
  { pattern: "دوشنبه", day: 1 },
  { pattern: "سه\\s?شنبه", day: 2 },
  { pattern: "چهار\\s?شنبه", day: 3 },
  { pattern: "پنج\\s?شنبه", day: 4 },
  { pattern: "جمعه", day: 5 },
  { pattern: "شنبه", day: 6 },
];

const MONTH_PATTERN = JALALI_MONTHS.join("|");
const WORD_NUMBERS: Record<string, number> = {
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
};
const NIGHT_CONTEXT = /(امشب|شب|عصر|بعد از ظهر)/;
/** Filler words left behind once the date/time fragments are cut out. */
const FILLER =
  /(?<=^|\s)(در|به|برای|واسه|واسه‌ی|تا|از|تاریخ|ساعت|وقت|دیگر|دیگه|بعد|آینده|بعدتر|بصورت|بسته)(?=\s|$)/g;

function normalize(input: string): string {
  return toAsciiDigits(input)
    .replace(/\u200c/g, " ") // ZWNJ
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[؟]/g, "?")
    .replace(/[،؛]/g, ",")
    .replace(/[\u064B-\u0652]/g, "") // harakat
    .replace(/[»«"']/g, "")
    .replace(/[()\u2010-\u2015\u2212]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Applies «صبح/ظهر/عصر/شب» modifiers to a clock hour. */
function applyDayPart(hour: number, dayPart: string | undefined): number {
  if (!dayPart) return hour;
  const part = dayPart.replace(/\s/g, "");
  if (part.includes("صبح")) return hour === 12 ? 0 : hour;
  if (part.includes("بعدازظهر") || part.includes("عصر"))
    return hour < 12 ? hour + 12 : hour;
  if (part.includes("شب")) return hour < 12 ? hour + 12 : hour;
  if (part.includes("ظهر")) return hour < 12 ? hour + 12 : hour;
  return hour;
}

function collectSpans(
  text: string,
  now: Date,
): {
  spans: Span[];
  date: Date | null;
  hasTime: boolean;
  notes: string[];
  jalali: boolean;
} {
  const spans: Span[] = [];
  const notes: string[] = [];
  let date: Date | null = null;
  let hasTime = false;
  let jalali = false;
  let dayOffsetDays: number | null = null;
  let weekday: number | null = null;
  let hour: number | null = null;
  let minute = 0;
  let monthDay: { month: number; day: number; year?: number } | null = null;

  // --- 1) absolute numeric dates: 1405/08/15 · 05/11/2026 · 2026-11-05 ---
  const numeric = text.match(
    /(\d{1,4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/,
  );
  if (numeric) {
    const [raw, a, b, c] = numeric;
    const g1 = Number(a);
    const g2 = Number(b);
    const g3 = Number(c);
    const year = c.length === 2 ? 1400 + g3 : g3;
    if (a.length === 4 && g1 >= 1700) {
      // ISO style: YYYY-MM-DD
      date = new Date(g1, g2 - 1, g3);
      notes.push(`تاریخ میلادی ${raw} → ${date.toLocaleDateString("en-CA")}`);
    } else if (a.length === 4 && g1 >= 1200) {
      // Jalali, year first: 1405/08/15
      date = jalaaliToDate(g1, g2, g3);
      jalali = true;
      notes.push(
        `تاریخ شمسی ${raw} → میلادی ${date.toLocaleDateString("en-CA")}`,
      );
    } else if (year >= 1300 && year <= 1599) {
      // Jalali, day first: 05/11/1405
      date = jalaaliToDate(year, g2, g1);
      jalali = true;
      notes.push(
        `تاریخ شمسی ${raw} → میلادی ${date.toLocaleDateString("en-CA")}`,
      );
    } else {
      // Gregorian, day first unless the second number cannot be a month
      const dayFirst = !(g1 <= 12 && g2 > 12);
      const day = dayFirst ? g1 : g2;
      const month = dayFirst ? g2 : g1;
      date = new Date(year, month - 1, day);
      notes.push(`تاریخ میلادی ${raw} → ${date.toLocaleDateString("en-CA")}`);
    }
    spans.push({
      start: numeric.index ?? 0,
      end: (numeric.index ?? 0) + raw.length,
      text: raw,
    });
  }

  // --- 2) Jalali month name: ۲۵ آبان [۱۴۰۵] ---
  if (!date) {
    const named = text.match(
      new RegExp(`(\\d{1,2})\\s*(${MONTH_PATTERN})\\s*(\\d{2,4})?`),
    );
    if (named) {
      const month =
        JALALI_MONTHS.indexOf(named[2] as (typeof JALALI_MONTHS)[number]) + 1;
      const day = Number(named[1]);
      const { jy } = dateToJalaali(now);
      monthDay = {
        month,
        day,
        year: named[3]
          ? Number(named[3].length === 2 ? `14${named[3]}` : named[3])
          : undefined,
      };
      jalali = true;
      notes.push(`تاریخ شمسی: ${toAsciiDigits(named[0])}`);
      spans.push({
        start: named.index ?? 0,
        end: (named.index ?? 0) + named[0].length,
        text: named[0],
      });
      void jy;
    }
  }

  // --- 3) relative day words ---
  const relativeWords: { pattern: RegExp; days: number }[] = [
    { pattern: /پس\s?فردا/, days: 2 },
    { pattern: /فردا/, days: 1 },
    { pattern: /امشب/, days: 0 },
    { pattern: /امروز/, days: 0 },
  ];
  for (const { pattern, days } of relativeWords) {
    const hit = text.match(pattern);
    if (hit && dayOffsetDays === null) {
      dayOffsetDays = days;
      if (hit[0].includes("امشب")) hour = hour ?? 21;
      notes.push(`روز: ${hit[0]}`);
      spans.push({
        start: hit.index ?? 0,
        end: (hit.index ?? 0) + hit[0].length,
        text: hit[0],
      });
      break;
    }
  }

  // --- 4) N روز/هفته/ماه دیگر ---
  const offset = text.match(/(\d{1,2})\s*(روز|هفته|ماه)\s*(?:دیگر|بعد)/);
  if (offset && dayOffsetDays === null) {
    const amount = Number(offset[1]);
    const unit = offset[2];
    dayOffsetDays =
      unit === "روز" ? amount : unit === "هفته" ? amount * 7 : amount * 30;
    notes.push(`جابه‌جایی: ${offset[0]}`);
    spans.push({
      start: offset.index ?? 0,
      end: (offset.index ?? 0) + offset[0].length,
      text: offset[0],
    });
  }

  // --- 4b) minute / hour offsets: «۵ دقیقه دیگر»، «۳ ساعت آینده»، «نیم ساعت دیگه» ---
  const offsetMinutes = text.match(
    /(\d{1,2}|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(دقیقه|دقیقه‌ی|دقیقه\s?ای|دققه)\s*(?:دیگر|دیگه|بعد|آینده|بعدتر)?/,
  );
  const offsetHours = text.match(
    /(\d{1,2}|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(ساعت)\s*(?:دیگر|دیگه|بعد|آینده|بعدتر)/,
  );
  const halfHour = text.match(/نیم\s?ساعت\s*(?:دیگر|دیگه|بعد|آینده)?/);
  const quarter = text.match(/یک?\s*ربع\s*(?:دیگر|دیگه|بعد|آینده)?/);
  const minuteDelta = (() => {
    if (offsetMinutes) {
      const amount = WORD_NUMBERS[offsetMinutes[1]] ?? Number(offsetMinutes[1]);
      if (Number.isFinite(amount)) return amount;
    }
    if (offsetHours) {
      const amount = WORD_NUMBERS[offsetHours[1]] ?? Number(offsetHours[1]);
      if (Number.isFinite(amount)) return amount * 60;
    }
    if (halfHour) return 30;
    if (quarter) return 15;
    return null;
  })();
  const minuteSpan = offsetMinutes ?? offsetHours ?? halfHour ?? quarter;
  if (minuteDelta !== null && minuteSpan) {
    notes.push(`فاصله: ${minuteDelta} دقیقه از حالا`);
    spans.push({
      start: minuteSpan.index ?? 0,
      end: (minuteSpan.index ?? 0) + minuteSpan[0].length,
      text: minuteSpan[0],
    });
  }

  // --- 5) weekday ---
  if (dayOffsetDays === null && !date && !monthDay) {
    for (const { pattern, day } of WEEKDAYS) {
      const hit = text.match(new RegExp(pattern));
      if (hit) {
        weekday = day;
        notes.push(`روز هفته: ${hit[0]}`);
        spans.push({
          start: hit.index ?? 0,
          end: (hit.index ?? 0) + hit[0].length,
          text: hit[0],
        });
        break;
      }
    }
  }

  // --- 6) clock time ---
  const clock = text.match(
    /(?:ساعت\s*)?(\d{1,2})\s*[:.]\s*(\d{2})\s*(صبح|ظهر|عصر|شب|بعد\s?از\s?ظهر)?/,
  );
  const hourWithPart = text.match(
    /(?:ساعت\s*)?(\d{1,2})\s*(صبح|ظهر|عصر|شب|بعد\s?از\s?ظهر)/,
  );
  const bareHour = text.match(/ساعت\s*(\d{1,2})(?!\s*[:.\d])/);
  if (clock) {
    hour = applyDayPart(Number(clock[1]), clock[3] ?? undefined);
    minute = Number(clock[2]);
    hasTime = true;
    notes.push(
      `ساعت: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
    spans.push({
      start: clock.index ?? 0,
      end: (clock.index ?? 0) + clock[0].length,
      text: clock[0],
    });
  } else if (hourWithPart) {
    hour = applyDayPart(Number(hourWithPart[1]), hourWithPart[2]);
    minute = 0;
    hasTime = true;
    notes.push(`ساعت: ${String(hour).padStart(2, "0")}:00`);
    spans.push({
      start: hourWithPart.index ?? 0,
      end: (hourWithPart.index ?? 0) + hourWithPart[0].length,
      text: hourWithPart[0],
    });
  } else if (bareHour) {
    const value = Number(bareHour[1]);
    hour = value <= 11 && NIGHT_CONTEXT.test(text) ? value + 12 : value;
    minute = 0;
    hasTime = true;
    notes.push(`ساعت: ${String(hour).padStart(2, "0")}:00`);
    spans.push({
      start: bareHour.index ?? 0,
      end: (bareHour.index ?? 0) + bareHour[0].length,
      text: bareHour[0],
    });
  }

  // --- resolve ---
  if (!date && monthDay) {
    const { jy } = dateToJalaali(now);
    let year = monthDay.year ?? jy;
    let candidate = jalaaliToDate(year, monthDay.month, monthDay.day);
    if (!monthDay.year && startOfDay(candidate) < startOfDay(now)) {
      // «۲۵ آبان» typed after that day passed → next year
      year += 1;
      candidate = jalaaliToDate(year, monthDay.month, monthDay.day);
      notes.push("این تاریخ امسال گذشته بود → سال بعد");
    }
    date = candidate;
  }

  if (!date && minuteDelta !== null) {
    date = new Date(now.getTime() + minuteDelta * 60_000);
    hasTime = true;
    hour = date.getHours();
    minute = date.getMinutes();
  }

  if (!date && dayOffsetDays !== null) {
    date = addDays(startOfDay(now), dayOffsetDays);
  }

  if (!date && weekday !== null) {
    const today = startOfDay(now);
    let delta = (weekday - today.getDay() + 7) % 7;
    if (delta === 0 && hasTime && hour !== null && hour <= now.getHours())
      delta = 7;
    date = addDays(today, delta);
    notes.push(`→ ${date.toLocaleDateString("en-CA")}`);
  }

  if (date && hour !== null) {
    date = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      0,
      0,
    );
  } else if (date && !hasTime) {
    date = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      9,
      0,
      0,
      0,
    );
    notes.push("بدون ساعت در متن");
    hour = 9;
  } else if (!date && hour !== null) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0,
    );
    date =
      candidate.getTime() <= now.getTime() ? addDays(candidate, 1) : candidate;
    if (date.getDate() !== candidate.getDate())
      notes.push("این ساعت امروز گذشت → فردا");
  }

  return { spans, date, hasTime, notes, jalali };
}

/** Removes the consumed spans and the filler words around them. */
function buildTitle(text: string, spans: Span[]): string {
  let title = text;
  for (const span of [...spans].sort(
    (left, right) => right.start - left.start,
  )) {
    title = title.slice(0, span.start) + " " + title.slice(span.end);
  }
  title = title
    .replace(/\s+/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,،.\-–\s]+|[,،.\-–\s]+$/g, "")
    .trim();
  return title;
}

/** Parses «طراحی سایت رامتین ترابر در تاریخ 05/11/2026 در ساعت 19:00» into a task. */
export function parseTaskText(
  input: string,
  now: Date = new Date(),
): ParsedTaskText {
  const text = normalize(input);
  if (!text) {
    return { title: "", date: null, hasTime: false, matched: [], notes: [] };
  }

  const { spans, date, hasTime, notes, jalali } = collectSpans(text, now);
  const title = buildTitle(text, spans);

  if (date) {
    notes.push(`نهایی: ${formatJalaliDateTime(date, hasTime)}`);
  }

  return {
    title: title || text,
    date,
    hasTime,
    matched: spans.map((span) => span.text),
    notes: jalali ? notes : notes,
  };
}

/** One-line Persian summary of the parse result, for previews. */
export function describeParse(parsed: ParsedTaskText): string {
  if (!parsed.date)
    return "تاریخ/ساعتی پیدا نشد — تسک بدون تاریخ ساخته می‌شود.";
  return `${formatJalaliDateTime(parsed.date, parsed.hasTime)} (میلادی ${parsed.date.toLocaleDateString("en-CA")})`;
}

export { startOfDay, addDays };
