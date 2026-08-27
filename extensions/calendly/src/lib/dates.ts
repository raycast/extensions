export function endOfRange(start: Date, days: number) {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isValidTimezone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function timezones() {
  const local = localTimezone();
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [local];
  return [local, ...supported.filter((zone) => zone !== local)];
}
