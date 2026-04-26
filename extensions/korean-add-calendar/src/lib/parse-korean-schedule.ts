export interface ParsedSchedule {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  source: string;
  intent: "event" | "deadline";
  recurrence?: ParsedRecurrence;
}

export interface ParsedRecurrence {
  frequency: "daily" | "weekly" | "monthly";
  weekday?: number;
  dayOfMonth?: number;
}

export type ParseResult =
  | {
      ok: true;
      value: ParsedSchedule;
    }
  | {
      ok: false;
      error: string;
    };

export interface ParseOptions {
  now?: Date;
  defaultDurationMinutes?: number;
}

type DateExpressionKind =
  | "absolute-with-year"
  | "absolute-month-day"
  | "month-modifier"
  | "weekday"
  | "day-modifier"
  | "relative-days-within"
  | "week-within";

const DAY_MODIFIER_TOKENS = ["오늘", "내일", "모레"] as const;
const WEEKDAY_TOKENS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const AM_TOKENS = new Set(["새벽", "아침", "오전"]);
const PM_TOKENS = new Set(["점심", "오후", "저녁", "밤"]);

// parse.rb의 정규식을 최대한 그대로 유지한다.
const MATCHER =
  /^((이달|이번달|담달|다음달|(내년|[0-9]{4}년){0,1} *[0-9]+월){0,1} *[0-9]+일+(?! *(?:안에|이내|내))|[0-9]+일 *(?:안에|이내|내)|오늘|내일|모레|(?:이번주|담주|다음주|다담주|다다음주) *내|(이번주|담주|다음주|다담주|다다음주){0,1} *([월화수목금토일](요일|욜)))( *(새벽|아침|점심|오전|오후|저녁|밤){0,1} *([0-9]+시|[0-9]+:[0-9]+) *([0-9]+분|반){0,1}){0,1}( *부터 *(?:새벽|아침|점심|오전|오후|저녁|밤){0,1} *(?:[0-9]+시|[0-9]+:[0-9]+) *(?:[0-9]+분|반){0,1} *까지){0,1}(?: *(?:까지|까지는|전까지|전에|전|이전까지|이전)){0,1}(?: *부터){0,1}에{0,1}( *(.+?)에서){0,1} */u;
const DEADLINE_SUFFIX_PATTERN = /(까지|까지는|전까지|전에|전|이전까지|이전)\s*$/u;
const RELATIVE_HOURS_WITHIN_PATTERN = /^([0-9]+)시간 *(안에|이내|내)\s*/u;
const DAY_WITHIN_PATTERN = /^(오늘|내일|모레)\s*중\s*/u;
const MONTH_WITHIN_PATTERN = /^(이달|이번달|담달|다음달)\s*내\s*/u;
const DAILY_RECURRENCE_PATTERN = /^매\s*일\s+(.+)$/u;
const WEEKLY_RECURRENCE_PATTERN = /^매\s*주(?:\s*([월화수목금토일](?:요일|욜)?))?\s+(.+)$/u;
const MONTHLY_RECURRENCE_PATTERN = /^매\s*월\s*([0-9]{1,2})일\s+(.+)$/u;
const DEADLINE_KEYWORD_ONLY_PREFIX_PATTERN = /^(마감|기한|데드라인)\s+(.+)$/u;
const DEADLINE_KEYWORD_ONLY_SUFFIX_PATTERN = /^(.+)\s+(마감|기한|데드라인)$/u;
const DEADLINE_KEYWORD_ONLY_SET = new Set(["마감", "기한", "데드라인"]);
const EXPLICIT_LOCATION_PATTERN = /(?:^|[\s,;])장소\s*(?:는|:|=)\s*(.+)$/u;
const TRAILING_LOCATION_AT_END_PATTERN = /^(.+?)\s+([^\s]+)에서$/u;
const LEADING_LOCATION_PATTERN = /^(.+?)에서\s+(.+)$/u;
const LOCATION_SURROUNDING_QUOTES_PATTERN = /^["'“”‘’]+|["'“”‘’]+$/gu;
const LOCATION_TRAILING_PUNCTUATION_PATTERN = /[.,!?;:。！？、]+$/gu;
const TOKEN_SPACING_NORMALIZERS: Array<[RegExp, string]> = [
  [/다다음\s*주/gu, "다다음주"],
  [/다담\s*주/gu, "다담주"],
  [/다음\s*주/gu, "다음주"],
  [/담\s*주/gu, "담주"],
  [/이번\s*주/gu, "이번주"],
  [/다음\s*달/gu, "다음달"],
  [/담\s*달/gu, "담달"],
  [/이번\s*달/gu, "이번달"],
  [/이\s*달/gu, "이달"],
];

export function parseKoreanSchedule(input: string, options: ParseOptions = {}): ParseResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: "일정 문장이 비어 있습니다.",
    };
  }

  const sourceString = input.normalize("NFC").trim();
  const normalizedScheduleString = normalizeTokenSpacing(sourceString);
  const explicitLocationExtraction = extractExplicitLocation(normalizedScheduleString);
  const trailingLocationExtraction = extractTrailingLocationAtSentenceEnd(explicitLocationExtraction.text);
  const scheduleString = trailingLocationExtraction.text;
  const explicitLocation = explicitLocationExtraction.location ?? trailingLocationExtraction.location;
  const now = options.now ? new Date(options.now) : new Date();
  const today = startOfDay(now);
  const durationMinutes = options.defaultDurationMinutes ?? 60;

  const recurringResult = tryParseRecurringSchedule({
    scheduleString,
    sourceString,
    explicitLocation,
    now,
    today,
    durationMinutes,
    options,
  });
  if (recurringResult) {
    return recurringResult;
  }

  const specialDeadlineResult = tryParseSpecialDeadlineSchedule({
    scheduleString,
    sourceString,
    explicitLocation,
    now,
    today,
    durationMinutes,
  });
  if (specialDeadlineResult) {
    return specialDeadlineResult;
  }

  const match = scheduleString.match(MATCHER);

  if (!match) {
    const keywordOnlyDeadlineResult = tryParseKeywordOnlyDeadline({
      scheduleString,
      sourceString,
      explicitLocation,
      today,
    });
    if (keywordOnlyDeadlineResult) {
      return keywordOnlyDeadlineResult;
    }

    return {
      ok: false,
      error: "날짜/시간 패턴을 인식하지 못했습니다. 예) 다음주 화요일 오후 3시에 회의",
    };
  }

  let absoluteDate: string | undefined = match[1];
  const weekModifierToken = match[4];
  const weekdayToken = match[5];
  const ampmToken = match[8];
  const hourToken = match[9];
  const minuteToken: string | number = match[10] ?? "0";
  const rangeTimeToken = match[11];
  const place = match[13]?.trim() || undefined;

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let date: Date | undefined;
  let dateExpressionKind: DateExpressionKind | undefined;

  let monthModifier: number | undefined;
  let dayModifier: number | undefined;
  let relativeWithinDays: number | undefined;
  let weekWithinModifier: number | undefined;

  if (absoluteDate) {
    const relativeWithinDaysMatch = absoluteDate.match(/^([0-9]+)일 *(안에|이내|내)$/u);
    if (relativeWithinDaysMatch) {
      relativeWithinDays = Number.parseInt(relativeWithinDaysMatch[1], 10);
    }

    const weekWithinMatch = absoluteDate.match(/^(이번주|담주|다음주|다담주|다다음주) *내$/u);
    if (weekWithinMatch) {
      weekWithinModifier = getWeekModifierDays(weekWithinMatch[1]);
    }

    if (/(오늘|내일|모레)/u.test(absoluteDate)) {
      const modifierIndex = DAY_MODIFIER_TOKENS.findIndex((token) => token === absoluteDate);
      dayModifier = modifierIndex >= 0 ? modifierIndex : undefined;
    }

    if (/(이달|이번달|담달|다음달)/u.test(absoluteDate)) {
      if (/(이달|이번달)/u.test(absoluteDate)) {
        monthModifier = 0;
      }
      if (/(담달|다음달)/u.test(absoluteDate)) {
        monthModifier = 1;
      }

      const dayMatch = absoluteDate.match(/([0-9]+)일/u);
      if (dayMatch) {
        day = Number.parseInt(dayMatch[1], 10);
      }
    }

    const fullDateMatch = absoluteDate.match(/(내년|([0-9]{4})년) *([0-9]+)월 *([0-9]+)일/u);
    if (fullDateMatch) {
      dateExpressionKind = "absolute-with-year";
      if (absoluteDate.includes("내년")) {
        year = today.getFullYear() + 1;
      }
      if (fullDateMatch[2]) {
        year = Number.parseInt(fullDateMatch[2], 10);
      }
      if (fullDateMatch[3]) {
        month = Number.parseInt(fullDateMatch[3], 10);
      }
      if (fullDateMatch[4]) {
        day = Number.parseInt(fullDateMatch[4], 10);
      }
    }
  }

  if (absoluteDate && /^[0-9월일 ]+$/u.test(absoluteDate.trim())) {
    absoluteDate = absoluteDate.trim();
  } else {
    absoluteDate = undefined;
  }

  const weekModifier = getWeekModifierDays(weekModifierToken);

  let weekday: number | undefined;
  if (weekdayToken) {
    const normalizedWeekday = weekdayToken.replace(/^([월화수목금토일]).*/u, "$1");
    const weekdayIndex = WEEKDAY_TOKENS.findIndex((token) => token === normalizedWeekday);
    if (weekdayIndex >= 0) {
      weekday = weekdayIndex;
    }
  }

  const startTime = parseTimeTokens(ampmToken, hourToken, minuteToken);
  let hour = startTime.hour;
  let minute = startTime.minute;
  const ampm = startTime.ampm;

  let endHour: number | undefined;
  let endMinute: number | undefined;
  let endAmpm: "am" | "pm" | undefined;
  let endAmpmToken: string | undefined;

  if (rangeTimeToken) {
    if (hour === undefined || minute === undefined) {
      return {
        ok: false,
        error: "시간 범위는 시작 시간을 포함해 입력해 주세요. 예) 내일 오후 4시부터 6시까지 회의",
      };
    }

    const rangeParseResult = parseRangeTimeToken(rangeTimeToken);
    if (!rangeParseResult.ok) {
      return {
        ok: false,
        error: rangeParseResult.error,
      };
    }

    const parsedRange = rangeParseResult.value;
    const endTime = parseTimeTokens(parsedRange.ampmToken, parsedRange.hourToken, parsedRange.minuteToken);
    endHour = endTime.hour;
    endMinute = endTime.minute;
    endAmpm = endTime.ampm;
    endAmpmToken = parsedRange.ampmToken;

    // 시작 시간이 오전/오후를 명시했고 종료 시간이 미명시인 경우, 같은 오전/오후로 해석한다.
    if (ampm !== undefined && endAmpm === undefined && ampmToken !== "밤") {
      endAmpm = ampm;
      endAmpmToken = ampmToken;
    }
  }

  if (relativeWithinDays !== undefined && (Number.isNaN(relativeWithinDays) || relativeWithinDays < 1)) {
    return {
      ok: false,
      error: "상대 일수는 1일 이상으로 입력해 주세요. 예) 3일 안에",
    };
  }

  const absoluteMonthDayMatch = absoluteDate?.match(/(([0-9]+)월){0,1} *([0-9]+)일/u);
  if (absoluteMonthDayMatch) {
    dateExpressionKind = "absolute-month-day";
    year = today.getFullYear();
    month = Number.parseInt(absoluteMonthDayMatch[2] ?? String(today.getMonth() + 1), 10);
    day = Number.parseInt(absoluteMonthDayMatch[3], 10);
  } else if (relativeWithinDays !== undefined) {
    dateExpressionKind = "relative-days-within";
    date = addDays(today, relativeWithinDays);
  } else if (weekWithinModifier !== undefined) {
    dateExpressionKind = "week-within";
    const currentWeekday = today.getDay() === 0 ? 7 : today.getDay();
    const offset = weekWithinModifier + (7 - currentWeekday);
    date = addDays(today, offset);
  } else if (monthModifier !== undefined && day !== undefined) {
    dateExpressionKind = "month-modifier";
    const shiftedDate = new Date(today.getFullYear(), today.getMonth() + monthModifier, 1);
    const shiftedYear = shiftedDate.getFullYear();
    const shiftedMonth = shiftedDate.getMonth() + 1;

    if (!isValidDayOfMonth(shiftedYear, shiftedMonth, day)) {
      return {
        ok: false,
        error: "유효하지 않은 날짜입니다. 월/일 조합을 확인해 주세요.",
      };
    }

    date = new Date(shiftedYear, shiftedMonth - 1, day);
  } else if (weekday !== undefined) {
    dateExpressionKind = "weekday";
    const normalizedWeekday = weekday === 0 ? 7 : weekday;
    const currentWeekday = today.getDay() === 0 ? 7 : today.getDay();
    const offset = (weekModifier ?? 0) - currentWeekday + normalizedWeekday;
    date = addDays(today, offset);
  } else if (dayModifier !== undefined) {
    dateExpressionKind = "day-modifier";
    date = addDays(today, dayModifier);
  }

  if (date) {
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  if (month !== undefined && (month < 1 || month > 12)) {
    return {
      ok: false,
      error: "월은 1부터 12 사이로 입력해 주세요.",
    };
  }

  if (day !== undefined && day < 1) {
    return {
      ok: false,
      error: "일은 1 이상의 값으로 입력해 주세요.",
    };
  }

  if (year !== undefined && month !== undefined && day !== undefined && !isValidDayOfMonth(year, month, day)) {
    return {
      ok: false,
      error: "유효하지 않은 날짜입니다. 월/일 조합을 확인해 주세요.",
    };
  }

  if (hour !== undefined) {
    if (ampm && (hour < 1 || hour > 12)) {
      return {
        ok: false,
        error: "오전/오후 시간은 1시부터 12시 사이로 입력해 주세요.",
      };
    }

    if (!ampm && (hour < 0 || hour > 23)) {
      return {
        ok: false,
        error: "시간은 0시부터 23시 사이로 입력해 주세요.",
      };
    }
  }

  if (minute !== undefined && (minute < 0 || minute > 59)) {
    return {
      ok: false,
      error: "분은 0부터 59 사이로 입력해 주세요.",
    };
  }

  if (endHour !== undefined) {
    if (endAmpm && (endHour < 1 || endHour > 12)) {
      return {
        ok: false,
        error: "종료 시간의 오전/오후 표기는 1시부터 12시 사이로 입력해 주세요.",
      };
    }

    if (!endAmpm && (endHour < 0 || endHour > 23)) {
      return {
        ok: false,
        error: "종료 시간은 0시부터 23시 사이로 입력해 주세요.",
      };
    }
  }

  if (endMinute !== undefined && (endMinute < 0 || endMinute > 59)) {
    return {
      ok: false,
      error: "종료 분은 0부터 59 사이로 입력해 주세요.",
    };
  }

  if (hour !== undefined) {
    hour = normalizeHour(hour, ampm, ampmToken);
  } else {
    minute = undefined;
  }

  if (endHour !== undefined) {
    endHour = normalizeHour(endHour, endAmpm, endAmpmToken);
  } else {
    endMinute = undefined;
  }

  if (year === undefined || month === undefined || day === undefined) {
    return {
      ok: false,
      error: "날짜를 계산하지 못했습니다. 숫자 날짜(예: 3월 2일) 또는 요일 표현을 확인해 주세요.",
    };
  }

  const rawTitle = scheduleString.replace(MATCHER, "").trim();
  const titleAndLocation =
    explicitLocation || place ? { title: rawTitle || "새 일정" } : extractTitleAndLocation(rawTitle);
  const title = titleAndLocation.title || "새 일정";
  const hasTime = hour !== undefined && minute !== undefined;
  const parsedHead = match[0].trim();
  const hasRangeExpression = Boolean(rangeTimeToken);
  const hasDeadlineSuffix = DEADLINE_SUFFIX_PATTERN.test(parsedHead);
  const deadlineByDateKind = dateExpressionKind === "relative-days-within" || dateExpressionKind === "week-within";
  const intent: ParsedSchedule["intent"] =
    !hasRangeExpression && (hasDeadlineSuffix || deadlineByDateKind) ? "deadline" : "event";

  let start: Date;
  let end: Date;

  if (hasTime) {
    start = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (endHour !== undefined && endMinute !== undefined) {
      end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
      if (end <= start) {
        end = addDays(end, 1);
      }
    } else {
      end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    }
  } else {
    start = new Date(year, month - 1, day, 0, 0, 0, 0);
    end = addDays(start, 1);
  }

  const comparisonNow = hasTime ? now : today;
  if (start < comparisonNow) {
    if (dateExpressionKind === "absolute-month-day") {
      while (start < comparisonNow) {
        start = addYears(start, 1);
        end = addYears(end, 1);
      }
    } else if (dateExpressionKind === "weekday" && weekModifier === undefined) {
      start = addDays(start, 7);
      end = addDays(end, 7);
    }
  }

  return {
    ok: true,
    value: {
      title,
      start,
      end,
      allDay: !hasTime,
      location: explicitLocation ?? sanitizeLocation(place) ?? titleAndLocation.location,
      source: sourceString,
      intent,
    },
  };
}

function normalizeTokenSpacing(value: string): string {
  let next = value;
  for (const [pattern, replacement] of TOKEN_SPACING_NORMALIZERS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function extractExplicitLocation(text: string): { text: string; location?: string } {
  const match = text.match(EXPLICIT_LOCATION_PATTERN);
  if (!match || match.index === undefined) {
    return { text };
  }

  const normalizedLocation = sanitizeLocation(match[1]);
  if (!normalizedLocation) {
    return { text };
  }

  const strippedText = text.slice(0, match.index).trim();
  return {
    text: strippedText || text,
    location: normalizedLocation,
  };
}

function extractTrailingLocationAtSentenceEnd(text: string): { text: string; location?: string } {
  const trimmed = text.trim();
  const trailingMatch = trimmed.match(TRAILING_LOCATION_AT_END_PATTERN);
  if (!trailingMatch) {
    return { text };
  }

  const titlePart = trailingMatch[1]?.trim();
  const normalizedLocation = sanitizeLocation(trailingMatch[2]);
  if (!titlePart || !normalizedLocation) {
    return { text };
  }

  return {
    text: titlePart,
    location: normalizedLocation,
  };
}

function tryParseKeywordOnlyDeadline({
  scheduleString,
  sourceString,
  explicitLocation,
  today,
}: {
  scheduleString: string;
  sourceString: string;
  explicitLocation?: string;
  today: Date;
}): ParseResult | null {
  const trimmed = scheduleString.trim();

  let title: string | undefined;
  const prefixMatch = trimmed.match(DEADLINE_KEYWORD_ONLY_PREFIX_PATTERN);
  if (prefixMatch) {
    title = prefixMatch[2]?.trim();
  }

  if (!title) {
    const suffixMatch = trimmed.match(DEADLINE_KEYWORD_ONLY_SUFFIX_PATTERN);
    if (suffixMatch) {
      title = suffixMatch[1]?.trim();
    }
  }

  if (!title && DEADLINE_KEYWORD_ONLY_SET.has(trimmed)) {
    title = "새 일정";
  }

  if (!title) {
    return null;
  }

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = addDays(start, 1);

  return {
    ok: true,
    value: {
      title: title || "새 일정",
      start,
      end,
      allDay: true,
      location: explicitLocation,
      source: sourceString,
      intent: "deadline",
    },
  };
}

function tryParseRecurringSchedule({
  scheduleString,
  sourceString,
  explicitLocation,
  now,
  today,
  durationMinutes,
  options,
}: {
  scheduleString: string;
  sourceString: string;
  explicitLocation?: string;
  now: Date;
  today: Date;
  durationMinutes: number;
  options: ParseOptions;
}): ParseResult | null {
  const dailyMatch = scheduleString.match(DAILY_RECURRENCE_PATTERN);
  if (dailyMatch) {
    const tail = dailyMatch[1].trim();
    const baseResult = parseKoreanSchedule(`오늘 ${tail}`, options);
    if (!baseResult.ok) {
      return {
        ok: false,
        error: `반복 일정 문장을 인식하지 못했습니다: ${baseResult.error}`,
      };
    }

    const recurrence: ParsedRecurrence = { frequency: "daily" };
    return buildRecurringParseResult({
      sourceString,
      now,
      today,
      durationMinutes,
      base: baseResult.value,
      recurrence,
      explicitLocation,
    });
  }

  const weeklyMatch = scheduleString.match(WEEKLY_RECURRENCE_PATTERN);
  if (weeklyMatch) {
    const weekdayToken = weeklyMatch[1];
    const tail = weeklyMatch[2].trim();
    const parsedWeekday = parseWeekdayToken(weekdayToken);
    const baseResult = parseKoreanSchedule(`오늘 ${tail}`, options);
    if (!baseResult.ok) {
      return {
        ok: false,
        error: `반복 일정 문장을 인식하지 못했습니다: ${baseResult.error}`,
      };
    }

    const recurrence: ParsedRecurrence = {
      frequency: "weekly",
      weekday: parsedWeekday ?? today.getDay(),
    };
    return buildRecurringParseResult({
      sourceString,
      now,
      today,
      durationMinutes,
      base: baseResult.value,
      recurrence,
      explicitLocation,
    });
  }

  const monthlyMatch = scheduleString.match(MONTHLY_RECURRENCE_PATTERN);
  if (monthlyMatch) {
    const dayOfMonth = Number.parseInt(monthlyMatch[1], 10);
    if (Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return {
        ok: false,
        error: "매월 반복의 일자는 1일부터 31일 사이로 입력해 주세요.",
      };
    }

    const tail = monthlyMatch[2].trim();
    const baseResult = parseKoreanSchedule(`오늘 ${tail}`, options);
    if (!baseResult.ok) {
      return {
        ok: false,
        error: `반복 일정 문장을 인식하지 못했습니다: ${baseResult.error}`,
      };
    }

    const recurrence: ParsedRecurrence = {
      frequency: "monthly",
      dayOfMonth,
    };
    return buildRecurringParseResult({
      sourceString,
      now,
      today,
      durationMinutes,
      base: baseResult.value,
      recurrence,
      explicitLocation,
    });
  }

  return null;
}

function buildRecurringParseResult({
  sourceString,
  now,
  today,
  durationMinutes,
  base,
  recurrence,
  explicitLocation,
}: {
  sourceString: string;
  now: Date;
  today: Date;
  durationMinutes: number;
  base: ParsedSchedule;
  recurrence: ParsedRecurrence;
  explicitLocation?: string;
}): ParseResult {
  const hasTime = !base.allDay;
  const hour = base.start.getHours();
  const minute = base.start.getMinutes();
  const durationMs = hasTime ? Math.max(base.end.getTime() - base.start.getTime(), 60 * 1000) : 24 * 60 * 60 * 1000;

  let start: Date;
  if (recurrence.frequency === "daily") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
    if (hasTime && start < now) {
      start = addDays(start, 1);
    }
  } else if (recurrence.frequency === "weekly") {
    const targetWeekday = recurrence.weekday ?? today.getDay();
    start = nextWeeklyOccurrence({
      today,
      now,
      targetWeekday,
      hasTime,
      hour,
      minute,
    });
  } else {
    start = nextMonthlyOccurrence({
      now,
      today,
      dayOfMonth: recurrence.dayOfMonth ?? today.getDate(),
      hasTime,
      hour,
      minute,
    });
  }

  const end = hasTime
    ? new Date(start.getTime() + Math.max(durationMs, durationMinutes * 60 * 1000))
    : addDays(start, 1);

  return {
    ok: true,
    value: {
      ...base,
      start,
      end,
      intent: "event",
      location: explicitLocation ?? base.location,
      source: sourceString,
      recurrence,
    },
  };
}

function parseWeekdayToken(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }
  const normalized = token.replace(/^([월화수목금토일]).*$/u, "$1");
  const index = WEEKDAY_TOKENS.findIndex((weekday) => weekday === normalized);
  return index >= 0 ? index : undefined;
}

function nextWeeklyOccurrence({
  today,
  now,
  targetWeekday,
  hasTime,
  hour,
  minute,
}: {
  today: Date;
  now: Date;
  targetWeekday: number;
  hasTime: boolean;
  hour: number;
  minute: number;
}): Date {
  const normalizedTargetWeekday = targetWeekday === 0 ? 7 : targetWeekday;
  const currentWeekday = today.getDay() === 0 ? 7 : today.getDay();
  const delta = (normalizedTargetWeekday - currentWeekday + 7) % 7;
  let candidate = addDays(today, delta);
  candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), hour, minute, 0, 0);

  if (hasTime ? candidate < now : candidate < today) {
    candidate = addDays(candidate, 7);
  }

  return candidate;
}

function nextMonthlyOccurrence({
  now,
  today,
  dayOfMonth,
  hasTime,
  hour,
  minute,
}: {
  now: Date;
  today: Date;
  dayOfMonth: number;
  hasTime: boolean;
  hour: number;
  minute: number;
}): Date {
  const comparisonNow = hasTime ? now : today;
  for (let offset = 0; offset <= 24; offset += 1) {
    const pivot = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    if (!isValidDayOfMonth(pivot.getFullYear(), pivot.getMonth() + 1, dayOfMonth)) {
      continue;
    }

    const candidate = new Date(pivot.getFullYear(), pivot.getMonth(), dayOfMonth, hour, minute, 0, 0);
    if (candidate >= comparisonNow) {
      return candidate;
    }
  }

  // 24개월 안에서 계산이 안 되면 1개월 후 같은 규칙으로 보정한다.
  return new Date(today.getFullYear(), today.getMonth() + 1, 1, hour, minute, 0, 0);
}

function tryParseSpecialDeadlineSchedule({
  scheduleString,
  sourceString,
  explicitLocation,
  now,
  today,
  durationMinutes,
}: {
  scheduleString: string;
  sourceString: string;
  explicitLocation?: string;
  now: Date;
  today: Date;
  durationMinutes: number;
}): ParseResult | null {
  const relativeHoursMatch = scheduleString.match(RELATIVE_HOURS_WITHIN_PATTERN);
  if (relativeHoursMatch) {
    const relativeHours = Number.parseInt(relativeHoursMatch[1], 10);
    if (Number.isNaN(relativeHours) || relativeHours < 1) {
      return {
        ok: false,
        error: "상대 시간은 1시간 이상으로 입력해 주세요. 예) 3시간 이내",
      };
    }

    const due = addHours(now, relativeHours);
    const parsedTail = extractTitleAndLocation(scheduleString.slice(relativeHoursMatch[0].length));
    return {
      ok: true,
      value: {
        title: parsedTail.title,
        start: due,
        end: new Date(due.getTime() + durationMinutes * 60 * 1000),
        allDay: false,
        location: explicitLocation ?? parsedTail.location,
        source: sourceString,
        intent: "deadline",
      },
    };
  }

  const dayWithinMatch = scheduleString.match(DAY_WITHIN_PATTERN);
  if (dayWithinMatch) {
    const modifier = getDayModifier(dayWithinMatch[1]);
    if (modifier === undefined) {
      return null;
    }

    const dueDay = addDays(today, modifier);
    const start = new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate(), 0, 0, 0, 0);
    const parsedTail = extractTitleAndLocation(scheduleString.slice(dayWithinMatch[0].length));
    return {
      ok: true,
      value: {
        title: parsedTail.title,
        start,
        end: addDays(start, 1),
        allDay: true,
        location: explicitLocation ?? parsedTail.location,
        source: sourceString,
        intent: "deadline",
      },
    };
  }

  const monthWithinMatch = scheduleString.match(MONTH_WITHIN_PATTERN);
  if (monthWithinMatch) {
    const monthModifier = getMonthModifierDays(monthWithinMatch[1]);
    if (monthModifier === undefined) {
      return null;
    }

    const shiftedDate = new Date(today.getFullYear(), today.getMonth() + monthModifier, 1);
    const lastDay = new Date(shiftedDate.getFullYear(), shiftedDate.getMonth() + 1, 0).getDate();
    const start = new Date(shiftedDate.getFullYear(), shiftedDate.getMonth(), lastDay, 0, 0, 0, 0);
    const parsedTail = extractTitleAndLocation(scheduleString.slice(monthWithinMatch[0].length));
    return {
      ok: true,
      value: {
        title: parsedTail.title,
        start,
        end: addDays(start, 1),
        allDay: true,
        location: explicitLocation ?? parsedTail.location,
        source: sourceString,
        intent: "deadline",
      },
    };
  }

  return null;
}

function parseTimeTokens(
  ampmToken: string | undefined,
  hourToken: string | undefined,
  minuteToken: string | number,
): {
  hour: number | undefined;
  minute: number | undefined;
  ampm: "am" | "pm" | undefined;
} {
  let hour: number | undefined;
  let parsedMinuteToken: string | number = minuteToken;

  if (hourToken) {
    const hourMinuteMatch = hourToken.match(/^([0-9]+):([0-9]+)$/u);
    if (hourMinuteMatch) {
      hour = Number.parseInt(hourMinuteMatch[1], 10);
      parsedMinuteToken = `${hourMinuteMatch[2]}분`;
    } else {
      const parsedHour = Number.parseInt(hourToken.replace(/[^0-9]/g, ""), 10);
      if (!Number.isNaN(parsedHour)) {
        hour = parsedHour;
      }
    }
  }

  let ampm: "am" | "pm" | undefined;
  if (typeof ampmToken === "string") {
    if (AM_TOKENS.has(ampmToken)) {
      ampm = "am";
    }
    if (PM_TOKENS.has(ampmToken)) {
      ampm = "pm";
    }
  }

  let minute: number | undefined;
  if (hour !== undefined) {
    if (typeof parsedMinuteToken === "string") {
      if (parsedMinuteToken === "반") {
        minute = 30;
      } else {
        minute = Number.parseInt(parsedMinuteToken.replace(/분/g, ""), 10);
      }
    } else {
      minute = parsedMinuteToken;
    }
  }

  if (minute !== undefined && Number.isNaN(minute)) {
    minute = 0;
  }

  return {
    hour,
    minute,
    ampm,
  };
}

function parseRangeTimeToken(rangeTimeToken: string):
  | {
      ok: true;
      value: {
        ampmToken: string | undefined;
        hourToken: string;
        minuteToken: string | number;
      };
    }
  | {
      ok: false;
      error: string;
    } {
  const rangeMatch = rangeTimeToken.match(
    /^\s*부터\s*(새벽|아침|점심|오전|오후|저녁|밤){0,1}\s*([0-9]+시|[0-9]+:[0-9]+)\s*([0-9]+분|반){0,1}\s*까지\s*$/u,
  );

  if (!rangeMatch) {
    return {
      ok: false,
      error: "시간 범위를 인식하지 못했습니다. 예) 내일 오후 4시부터 6시까지 회의",
    };
  }

  return {
    ok: true,
    value: {
      ampmToken: rangeMatch[1],
      hourToken: rangeMatch[2],
      minuteToken: rangeMatch[3] ?? "0",
    },
  };
}

function normalizeHour(hour: number, ampm: "am" | "pm" | undefined, ampmToken: string | undefined): number {
  if (ampm === "am" && hour === 12) {
    return 0;
  }
  if (ampmToken === "밤" && hour === 12) {
    return 24;
  }
  if (ampm === "pm" && hour < 12) {
    return hour + 12;
  }
  return hour;
}

function getWeekModifierDays(token: string | undefined): number | undefined {
  if (token === "이번주") {
    return 0;
  }
  if (token === "담주" || token === "다음주") {
    return 7;
  }
  if (token === "다담주" || token === "다다음주") {
    return 14;
  }
  return undefined;
}

function getDayModifier(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }
  const modifierIndex = DAY_MODIFIER_TOKENS.findIndex((modifierToken) => modifierToken === token);
  return modifierIndex >= 0 ? modifierIndex : undefined;
}

function getMonthModifierDays(token: string | undefined): number | undefined {
  if (token === "이달" || token === "이번달") {
    return 0;
  }
  if (token === "담달" || token === "다음달") {
    return 1;
  }
  return undefined;
}

function extractTitleAndLocation(text: string): { title: string; location?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { title: "새 일정" };
  }

  const trailingLocationMatch = trimmed.match(TRAILING_LOCATION_AT_END_PATTERN);
  if (trailingLocationMatch) {
    const title = trailingLocationMatch[1]?.trim() || "새 일정";
    const location = sanitizeLocation(trailingLocationMatch[2]);
    if (location) {
      return {
        title,
        location,
      };
    }
  }

  const leadingLocationMatch = trimmed.match(LEADING_LOCATION_PATTERN);
  if (leadingLocationMatch) {
    return {
      title: leadingLocationMatch[2].trim() || "새 일정",
      location: sanitizeLocation(leadingLocationMatch[1]),
    };
  }

  return { title: trimmed };
}

function sanitizeLocation(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const collapsed = value.replace(/\s+/gu, " ").trim();
  if (!collapsed) {
    return undefined;
  }

  const withoutTrailingPunctuation = collapsed.replace(LOCATION_TRAILING_PUNCTUATION_PATTERN, "").trim();
  const unquoted = withoutTrailingPunctuation.replace(LOCATION_SURROUNDING_QUOTES_PATTERN, "").trim();
  const normalized = unquoted.replace(LOCATION_TRAILING_PUNCTUATION_PATTERN, "").trim();
  return normalized || undefined;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function addYears(date: Date, years: number): Date {
  return new Date(
    date.getFullYear() + years,
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function isValidDayOfMonth(year: number, month: number, day: number): boolean {
  const maxDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDay;
}
