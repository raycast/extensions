export type TimestampUnit = "auto" | "seconds" | "milliseconds";

export type ParseResult = { date: Date; source: string } | { error: string };

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const formattedYear = year >= 0 && year <= 9999 ? pad(year, 4) : `${year < 0 ? "-" : "+"}${pad(Math.abs(year), 6)}`;
  return `${formattedYear}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function getTimeValues(date: Date) {
  return [
    { id: "local", title: "本地日期时间", value: formatLocalDate(date) },
    { id: "utc", title: "UTC 日期时间", value: date.toISOString() },
    { id: "seconds", title: "时间戳（秒）", value: String(Math.floor(date.getTime() / 1000)) },
    { id: "milliseconds", title: "时间戳（毫秒）", value: String(date.getTime()) },
  ];
}

export function parseTime(input: string, unit: TimestampUnit = "auto"): ParseResult {
  const text = input.trim();
  if (/^[+-]?\d+$/.test(text)) {
    // Digit count is intentionally explicit: older millisecond timestamps can be ambiguous.
    const resolvedUnit =
      unit === "auto" ? (text.replace(/^[+-]?0*/, "").length <= 10 ? "seconds" : "milliseconds") : unit;
    const number = Number(text);
    const milliseconds = resolvedUnit === "seconds" ? number * 1000 : number;
    const date = new Date(milliseconds);
    if (!Number.isSafeInteger(number) || !Number.isFinite(date.getTime())) {
      return { error: "时间戳超出支持范围，请输入有效的整数秒或毫秒。" };
    }
    return { date, source: resolvedUnit === "seconds" ? "秒时间戳" : "毫秒时间戳" };
  }

  // Parse explicitly instead of relying on platform-dependent Date.parse behavior.
  const match =
    /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      text,
    );
  if (!match) {
    return {
      error: "请输入整数时间戳，或 YYYY-MM-DD HH:mm:ss（可带毫秒）；也支持 ISO 8601 时区。",
    };
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0", ms = "0", zone] = match;
  if (y === "-000000") return { error: "年份无效，请使用 0000 表示公元 0 年。" };
  const [year, month, day, hour, minute, second, millisecond] = [y, mo, d, h, mi, s, ms.padEnd(3, "0")].map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, millisecond);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return { error: "日期或时间无效，请检查月份、天数及小时、分钟、秒。" };
  }
  if (zone) {
    let offset = 0;
    if (zone !== "Z") {
      const digits = zone.slice(1).replace(":", "");
      const offsetHours = Number(digits.slice(0, 2));
      const offsetMinutes = Number(digits.slice(2));
      if (offsetHours > 23 || offsetMinutes > 59) return { error: "时区偏移无效。" };
      offset = (offsetHours * 60 + offsetMinutes) * (zone[0] === "+" ? 1 : -1);
    }
    const date = new Date(calendar.getTime() - offset * 60000);
    if (!Number.isFinite(date.getTime())) {
      return { error: "应用时区偏移后的日期超出支持范围。" };
    }
    return { date, source: "带时区日期字符串" };
  }
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, millisecond);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return { error: "该本地时间不存在（可能位于夏令时跳转区间）。" };
  }
  return { date, source: "本地日期字符串" };
}
