export type TimestampUnit = "auto" | "seconds" | "milliseconds";

export interface ParsedTimestamp {
  date: Date;
  milliseconds: number;
  seconds: number;
  unit: Exclude<TimestampUnit, "auto">;
}

export const isTimestamp = (input: string) => /^[+-]?\d+(?:\.\d+)?$/.test(input.trim());

export function parseTimestamp(input: string, unit: TimestampUnit = "auto"): ParsedTimestamp {
  const text = input.trim();
  if (!isTimestamp(text)) throw new Error("Enter a valid numeric timestamp.");
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error("The timestamp is outside the supported numeric range.");
  const detectedUnit = unit === "auto" ? (Math.abs(value) < 100_000_000_000 ? "seconds" : "milliseconds") : unit;
  const [whole, fraction = ""] = text.split(".");
  // Convert the decimal fraction separately to avoid 1.001 * 1000 becoming
  // 1000.9999999999999. Date precision is milliseconds, truncated toward zero.
  const milliseconds =
    detectedUnit === "seconds"
      ? Number(whole) * 1000 + (text.startsWith("-") ? -1 : 1) * Number(fraction.padEnd(3, "0").slice(0, 3))
      : Number(whole);
  if (!Number.isSafeInteger(Math.trunc(milliseconds)))
    throw new Error("The timestamp exceeds the safe integer precision range.");
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error("The timestamp is outside the supported date range.");
  return { date, milliseconds: date.getTime(), seconds: date.getTime() / 1000, unit: detectedUnit };
}

export function formatInTimeZone(date: Date, timeZone: string): { time: string; offset: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    era: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year").padStart(4, "0");
  const era = part("era") === "BC" ? " BC" : "";
  return {
    time: `${year}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}.${part("fractionalSecond")}${era}`,
    offset: part("timeZoneName").replace("GMT", "UTC"),
  };
}
