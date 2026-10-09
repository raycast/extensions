export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const TIME_ZONES: string[] = [
  ...new Set(["UTC", systemTimeZone(), ...Intl.supportedValuesOf("timeZone")]),
].sort();

export function utcOffset(tz: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(at);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

export function localTime(tz: string, at = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(at);
}

/** "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
export function cityName(tz: string): string {
  return tz.slice(tz.lastIndexOf("/") + 1).replaceAll("_", " ");
}
