export type TimestampUnit = "auto" | "seconds" | "milliseconds";

export interface ParsedTimestamp {
  date: Date;
  milliseconds: number;
  seconds: number;
  unit: Exclude<TimestampUnit, "auto">;
}

export function parseTimestamp(input: string, unit: TimestampUnit = "auto"): ParsedTimestamp {
  const text = input.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) throw new Error("Enter a valid numeric timestamp.");
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error("The timestamp is outside the supported numeric range.");
  const detectedUnit = unit === "auto" ? (Math.abs(value) < 100_000_000_000 ? "seconds" : "milliseconds") : unit;
  const milliseconds = value * (detectedUnit === "seconds" ? 1000 : 1);
  if (!Number.isSafeInteger(Math.trunc(milliseconds)))
    throw new Error("The timestamp exceeds the safe integer precision range.");
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error("The timestamp is outside the supported date range.");
  return { date, milliseconds: date.getTime(), seconds: date.getTime() / 1000, unit: detectedUnit };
}

export function parseTimeZones(input: string): string[] {
  const zones = [
    ...new Set(
      input
        .split(/[,\n，]/)
        .map((zone) => zone.trim())
        .filter(Boolean),
    ),
  ];
  if (!zones.length) throw new Error("Select at least one time zone, such as Asia/Shanghai or UTC.");
  for (const timeZone of zones) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    } catch {
      throw new Error(`Invalid time zone: ${timeZone}. Use an IANA time zone name.`);
    }
  }
  return zones;
}

export function formatInTimeZone(date: Date, timeZone: string): { time: string; offset: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
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
  return {
    time: `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}.${part("fractionalSecond")}`,
    offset: part("timeZoneName").replace("GMT", "UTC"),
  };
}
