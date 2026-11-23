import { DateTime } from "luxon";
import { DateOrder, parseCalendarInput } from "./calendar";

export type ParsedTime = {
  ok: true;
  milliseconds: number;
  source: "current" | "seconds" | "milliseconds" | "date";
  inputFormat?: string;
};

export type ParseResult = ParsedTime | { ok: false; error: string };

const MAX_MILLISECONDS = 8_640_000_000_000_000n;
const NUMERIC_INPUT = /^([+-]?\d+)(?:\.(\d+))?\s*(ms|s|毫秒|秒)?$/i;

function cleanInput(input: string): string {
  const trimmed = input.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Never send input over the network or rely on locale-dependent Date.parse. */
export function parseInput(
  input: string,
  timezone = "Asia/Shanghai",
  now = Date.now(),
  dateOrder: DateOrder = "auto",
): ParseResult {
  const text = cleanInput(input);
  if (text.length > 128) {
    return { ok: false, error: "输入过长，请只粘贴时间戳或日期。" };
  }
  if (!text || /^(now|现在|当前)$/i.test(text)) {
    return { ok: true, milliseconds: now, source: "current" };
  }

  // 14 digits are the conventional YYYYMMDDHHmmss calendar representation.
  // Bare 8-digit values keep their original Unix-seconds meaning.
  const numeric = /^\d{14}$/.test(text) ? null : text.match(NUMERIC_INPUT);
  if (numeric) {
    const [, integer, fraction = "", suffix = ""] = numeric;
    const digits = integer.replace(/^[+-]/, "").replace(/^0+(?=\d)/, "").length;
    const explicitUnit = suffix.toLowerCase();
    if (!explicitUnit && digits > 13) {
      return {
        ok: false,
        error:
          "位数超过 13 位。若确实是秒或毫秒，请在末尾添加 s 或 ms；不支持微秒、纳秒。",
      };
    }
    const isMilliseconds =
      explicitUnit === "ms" ||
      explicitUnit === "毫秒" ||
      (!explicitUnit && digits > 10);
    if ((isMilliseconds && fraction) || fraction.length > 3) {
      return {
        ok: false,
        error: "毫秒时间戳应为整数；秒时间戳最多保留 3 位小数。",
      };
    }
    const sign = integer.startsWith("-") ? -1n : 1n;
    const milliseconds = isMilliseconds
      ? BigInt(integer)
      : BigInt(integer) * 1000n + sign * BigInt(fraction.padEnd(3, "0"));
    if (milliseconds > MAX_MILLISECONDS || milliseconds < -MAX_MILLISECONDS) {
      return { ok: false, error: "时间戳超出可表示的日期范围。" };
    }
    return {
      ok: true,
      milliseconds: Number(milliseconds),
      source: isMilliseconds ? "milliseconds" : "seconds",
    };
  }

  return parseCalendarInput(text, timezone, dateOrder);
}

export function formatTime(milliseconds: number, timezone = "Asia/Shanghai") {
  const date = DateTime.fromMillis(milliseconds, {
    zone: timezone,
    locale: "en-US",
    numberingSystem: "latn",
    outputCalendar: "gregory",
  });
  return {
    dateTime: date.toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
    timezone: date.zoneName ?? timezone,
    offset: `UTC${date.toFormat("ZZ")}`,
    seconds: String(Math.floor(milliseconds / 1000)),
    milliseconds: String(milliseconds),
    iso: new Date(milliseconds).toISOString(),
    utc: date.toUTC().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
    hasMilliseconds: milliseconds % 1000 !== 0,
    localIso: date.toISO({ suppressMilliseconds: false }) ?? "",
    rfc2822: date.toRFC2822() ?? "",
    http: date.toHTTP() ?? "",
    compact: date.toFormat("yyyyMMddHHmmss"),
  };
}
