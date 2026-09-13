export type RecordDetailField = {
  label: string;
  value: string;
};

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const INTERNAL_FIELD_LABELS = new Set(["id", "record id"]);

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDetailDate(
  value: string,
  timeZone?: string,
): string | undefined {
  if (!ISO_DATE.test(value)) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const parts = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("month")} ${part("day")}, ${part("year")} ${part("hour")}:${part("minute")}${part("dayPeriod")}`;
}

export function formatDetailValue(value: string, timeZone?: string) {
  const formattedDate = formatDetailDate(value, timeZone);
  if (formattedDate) return formattedDate;

  if (/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/.test(value)) {
    return titleCase(value);
  }

  return value;
}

export function formatRecordDetailFields(
  fields: RecordDetailField[],
  timeZone?: string,
) {
  return fields
    .filter(
      ({ label }) => !INTERNAL_FIELD_LABELS.has(label.trim().toLowerCase()),
    )
    .map(({ label, value }) => ({
      label,
      value: formatDetailValue(value, timeZone),
    }));
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]()<>#+.!|])/g, "\\$1");
}

export function recordDetailMarkdown(title: string, objectType?: string) {
  return `# ${escapeMarkdown(title)}${
    objectType ? `\n\n${escapeMarkdown(objectType)}` : ""
  }`;
}
