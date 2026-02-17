export interface ParsedSchedule {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  source: string;
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

type DateExpressionKind = "absolute-with-year" | "absolute-month-day" | "month-modifier" | "weekday" | "day-modifier";

const DAY_MODIFIER_TOKENS = ["오늘", "내일", "모레"] as const;
const WEEKDAY_TOKENS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const AM_TOKENS = new Set(["새벽", "아침", "오전"]);
const PM_TOKENS = new Set(["점심", "오후", "저녁", "밤"]);

// parse.rb의 정규식을 최대한 그대로 유지한다.
const MATCHER =
  /^((이달|이번달|담달|다음달|(내년|[0-9]{4}년){0,1} *[0-9]+월){0,1} *[0-9]+일+|오늘|내일|모레|(이번주|담주|다음주|다담주|다다음주){0,1} *([월화수목금토일](요일|욜)))( *(새벽|아침|점심|오전|오후|저녁|밤){0,1} *([0-9]+시|[0-9]+:[0-9]+) *([0-9]+분|반){0,1}){0,1}에{0,1}( *(.+?)에서){0,1} */u;

export function parseKoreanSchedule(input: string, options: ParseOptions = {}): ParseResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: "일정 문장이 비어 있습니다.",
    };
  }

  const scheduleString = input.normalize("NFC").trim();
  const match = scheduleString.match(MATCHER);

  if (!match) {
    return {
      ok: false,
      error: "날짜/시간 패턴을 인식하지 못했습니다. 예) 다음주 화요일 오후 3시에 회의",
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const today = startOfDay(now);
  const durationMinutes = options.defaultDurationMinutes ?? 60;

  let absoluteDate: string | undefined = match[1];
  const weekModifierToken = match[4];
  const weekdayToken = match[5];
  const ampmToken = match[8];
  const hourToken = match[9];
  let minuteToken: string | number = match[10] ?? "0";
  const place = match[12]?.trim() || undefined;

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let date: Date | undefined;
  let dateExpressionKind: DateExpressionKind | undefined;

  let monthModifier: number | undefined;
  let dayModifier: number | undefined;

  if (absoluteDate) {
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

  let weekModifier: number | undefined;
  if (weekModifierToken === "이번주") {
    weekModifier = 0;
  }
  if (weekModifierToken === "담주" || weekModifierToken === "다음주") {
    weekModifier = 7;
  }
  if (weekModifierToken === "다담주" || weekModifierToken === "다다음주") {
    weekModifier = 14;
  }

  let weekday: number | undefined;
  if (weekdayToken) {
    const normalizedWeekday = weekdayToken.replace(/^([월화수목금토일]).*/u, "$1");
    const weekdayIndex = WEEKDAY_TOKENS.findIndex((token) => token === normalizedWeekday);
    if (weekdayIndex >= 0) {
      weekday = weekdayIndex;
    }
  }

  let hour: number | undefined;
  if (hourToken) {
    const hourMinuteMatch = hourToken.match(/^([0-9]+):([0-9]+)$/u);
    if (hourMinuteMatch) {
      hour = Number.parseInt(hourMinuteMatch[1], 10);
      minuteToken = `${hourMinuteMatch[2]}분`;
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
  if (typeof minuteToken === "string") {
    if (minuteToken === "반") {
      minute = 30;
    } else {
      minute = Number.parseInt(minuteToken.replace(/분/g, ""), 10);
    }
  } else {
    minute = minuteToken;
  }

  if (minute !== undefined && Number.isNaN(minute)) {
    minute = 0;
  }

  const absoluteMonthDayMatch = absoluteDate?.match(/(([0-9]+)월){0,1} *([0-9]+)일/u);
  if (absoluteMonthDayMatch) {
    dateExpressionKind = "absolute-month-day";
    year = today.getFullYear();
    month = Number.parseInt(absoluteMonthDayMatch[2] ?? String(today.getMonth() + 1), 10);
    day = Number.parseInt(absoluteMonthDayMatch[3], 10);
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

  if (hour !== undefined) {
    // 12시간 표현(오전/오후)과 24시간 표현(14:30 등)을 모두 안전하게 처리한다.
    if (ampm === "am" && hour === 12) {
      hour = 0;
    } else if (ampmToken === "밤" && hour === 12) {
      hour = 24;
    } else if (ampm === "pm" && hour < 12) {
      hour += 12;
    }
  } else {
    minute = undefined;
  }

  if (year === undefined || month === undefined || day === undefined) {
    return {
      ok: false,
      error: "날짜를 계산하지 못했습니다. 숫자 날짜(예: 3월 2일) 또는 요일 표현을 확인해 주세요.",
    };
  }

  const title = scheduleString.replace(MATCHER, "").trim() || "새 일정";
  const hasTime = hour !== undefined && minute !== undefined;

  let start: Date;
  let end: Date;

  if (hasTime) {
    start = new Date(year, month - 1, day, hour, minute, 0, 0);
    end = new Date(start.getTime() + durationMinutes * 60 * 1000);
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
      location: place,
      source: scheduleString,
    },
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
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
