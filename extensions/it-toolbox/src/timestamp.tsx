import { Icon } from "@raycast/api";
import { PREVIEW_LIMITS, formatTimestamp, parseDateFlexible, textMeta } from "./utils/toolbox";
import { ResultRow } from "./components/ResultList";
import { InputForm } from "./components/InputForm";

type FieldKey =
  | "datetime"
  | "seconds"
  | "milliseconds"
  | "iso"
  | "isoLocal"
  | "utc"
  | "date"
  | "time"
  | "rfc2822"
  | "micros"
  | "timezone"
  | "relative"
  | "dateRange"
  | "weekRange";

/** Field definitions, shared by the live values and the regular computation so they cannot drift apart */
const FIELD_LABELS: Array<{ key: FieldKey; label: string; icon: Icon }> = [
  { key: "datetime", label: "Local time → timestamp (s / ms)", icon: Icon.Clock },
  { key: "seconds", label: "Timestamp (seconds)", icon: Icon.Number00 },
  { key: "milliseconds", label: "Timestamp (milliseconds)", icon: Icon.Number00 },
  { key: "iso", label: "ISO 8601 (UTC)", icon: Icon.Calendar },
  { key: "isoLocal", label: "ISO 8601 (local timezone)", icon: Icon.Calendar },
  { key: "utc", label: "UTC string", icon: Icon.Globe },
  { key: "date", label: "Date", icon: Icon.Calendar },
  { key: "time", label: "Time", icon: Icon.Clock },
  { key: "rfc2822", label: "RFC 2822", icon: Icon.Document },
  { key: "micros", label: "Timestamp (microseconds)", icon: Icon.Number00 },
  { key: "timezone", label: "Timezone offset", icon: Icon.Globe },
  { key: "relative", label: "Relative to now", icon: Icon.ArrowClockwise },
  { key: "dateRange", label: "Today start / end (timestamps)", icon: Icon.Calendar },
  { key: "weekRange", label: "This week start / end (timestamps)", icon: Icon.Calendar },
];

function buildRows(fields: Record<FieldKey, string>): ResultRow[] {
  return FIELD_LABELS.map(({ key, label, icon }) => {
    const value = fields[key];
    const meta = textMeta(value);
    return {
      id: key,
      title: value,
      subtitle: meta.chars <= PREVIEW_LIMITS.titleChars ? label : `${label} · ${meta.chars} chars`,
      detail: value,
      icon,
      copyValue: value,
    } as ResultRow;
  });
}

/** Build the complete field table for one instant */
function fieldsOf(date: Date): Record<FieldKey, string> {
  const f = formatTimestamp(date);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime();
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
  const weekStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1),
    0,
    0,
    0,
  ).getTime();
  const weekEnd = weekStart + 7 * 24 * 3600 * 1000 - 1000;
  return {
    datetime: f.datetime,
    seconds: String(f.seconds),
    milliseconds: String(f.milliseconds),
    iso: f.iso,
    isoLocal: f.isoLocal,
    utc: f.utc,
    date: `${f.date} (${f.weekday})`,
    time: f.time,
    rfc2822: f.rfc2822,
    micros: String(f.micros),
    timezone: f.timezone,
    relative: f.relative,
    dateRange: `${Math.floor(dayStart / 1000)} → ${Math.floor(dayEnd / 1000)}`,
    weekRange: `${Math.floor(weekStart / 1000)} → ${Math.floor(weekEnd / 1000)}`,
  };
}

export default function Command() {
  return (
    <InputForm
      inputTitle="Time / Timestamp"
      placeholder="e.g. 1735689600, 1735689600000, 2026-01-01 08:00:00 — leave empty for the current time"
      defaultsSearchBarPlaceholder="Filter results, e.g. timestamp, ISO…"
      defaultsSectionTitle="Current time (live — ⌘⇧R to refresh)"
      defaults={() => buildRows(fieldsOf(new Date()))}
      compute={(values) => {
        const raw = (values.input ?? "").trim();
        const date = raw ? parseDateFlexible(raw) : null;
        if (raw && !date) return [];
        // Empty input means live values: show the current time and timestamp straight away
        return buildRows(fieldsOf(date ?? new Date()));
      }}
    />
  );
}
