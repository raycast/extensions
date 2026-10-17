export type EventLabel = {
  id?: string | null;
  backgroundColor?: string | null;
  name?: string | null;
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function assertNonEmpty(value: string, name: string) {
  if (!value.trim()) throw new Error(`${name} cannot be empty.`);
}

export function assertTimeZone(timeZone: string | undefined) {
  if (timeZone === undefined) return;
  assertNonEmpty(timeZone, "timeZone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error(`Invalid IANA time zone "${timeZone}".`);
  }
}

export function normalizeHexColor(color: string, name = "color") {
  const normalized = color.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw new Error(`${name} must be a six-digit hexadecimal color such as #039be5.`);
  }
  return normalized.toLowerCase();
}

export function requireLabel(labels: EventLabel[], labelId: string) {
  const label = labels.find((candidate) => candidate.id === labelId);
  if (!label) throw new Error(`Event label "${labelId}" does not exist on this calendar.`);
  return label;
}

export type EventLabelChange =
  | { action: "create"; id: string; name: string; backgroundColor: string }
  | { action: "rename"; labelId: string; name: string }
  | { action: "recolor"; labelId: string; backgroundColor: string }
  | { action: "delete"; labelId: string };

export function mergeEventLabels(labels: EventLabel[], change: EventLabelChange): EventLabel[] {
  const result = labels.map((label) => ({ ...label }));
  if (change.action === "create") {
    return [
      ...result,
      {
        id: change.id,
        name: change.name,
        backgroundColor: normalizeHexColor(change.backgroundColor, "backgroundColor"),
      },
    ];
  }

  const existing = requireLabel(result, change.labelId);
  if (change.action === "rename") existing.name = change.name;
  if (change.action === "recolor") {
    existing.backgroundColor = normalizeHexColor(change.backgroundColor, "backgroundColor");
  }
  if (change.action === "delete") result.splice(result.indexOf(existing), 1);
  return result;
}
