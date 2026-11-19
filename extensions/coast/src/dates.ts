export function formatLocalDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function today(): string {
  return formatLocalDate(new Date());
}

export function readableTime(value: string, detailed = false): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const day = formatLocalDate(date);
  const label =
    day === today()
      ? "Today"
      : day === offsetDate(1)
        ? "Yesterday"
        : date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(detailed ? { timeZoneName: "short" as const } : {}),
  });
  return `${label}, ${time}`;
}

export function duration(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? "<1m" : "0m";
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

export function aroundMoment(timestamp: string, minutes: number): string {
  const center = new Date(timestamp).getTime();
  if (!Number.isFinite(center)) throw new Error("Invalid capture timestamp.");
  return `${formatLocalDateTime(new Date(center - minutes * 60_000))}|${formatLocalDateTime(new Date(center + minutes * 60_000))}`;
}

export function offsetDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}

export function recentRange(minutes: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60_000);
  return `${formatLocalDateTime(start)}|${formatLocalDateTime(end)}`;
}

export function scopeMetadata(range: string, locale?: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const since = range.startsWith("since:");
  const before = range.startsWith("before:");
  const values = (
    since ? range.slice(6) : before ? range.slice(7) : range
  ).split("|");
  const dates = values.map(
    (value) => new Date(dateOnly.test(value) ? `${value}T00:00:00` : value),
  );
  if (
    dates.length > 2 ||
    dates.some((date) => !Number.isFinite(date.getTime()))
  )
    return [{ title: "Scope", text: "Unrecognized time range" }];

  const dateFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  const labels = dates.map((date) => dateFormat.format(date));
  if (values.every((value) => dateOnly.test(value)))
    return dates.length === 1
      ? [
          {
            title: "Scope",
            text: `${since ? "Since " : before ? "Before " : ""}${labels[0]}`,
          },
        ]
      : [
          { title: "Scope", text: "Date range" },
          { title: "From", text: labels[0] },
          { title: "To", text: labels[1] },
        ];

  const sameDay = dates.length === 1 || labels[0] === labels[1];
  return [
    { title: "Scope", text: sameDay ? labels[0] : "Date/time range" },
    ...(!sameDay ? [{ title: "Start Date", text: labels[0] }] : []),
    {
      title: since ? "Since" : before ? "Before" : "Start",
      text: timeFormat.format(dates[0]),
    },
    ...(!sameDay ? [{ title: "End Date", text: labels[1] }] : []),
    ...(dates.length === 2
      ? [{ title: "End", text: timeFormat.format(dates[1]) }]
      : []),
  ];
}
