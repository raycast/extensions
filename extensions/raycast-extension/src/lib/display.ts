export interface MetadataRow {
  title: string;
  text: string;
}

export interface DisplayModel {
  markdown: string;
  metadataRows: MetadataRow[];
  rawJson: string;
}

const MAX_STRING_PREVIEW = 160;
const MAX_OBJECT_FIELDS = 12;
const MAX_ARRAY_ITEMS = 10;

export function buildDisplayModel(value: unknown): DisplayModel {
  const rawJson = JSON.stringify(value, null, 2);
  const metadataRows: MetadataRow[] = [];

  if (Array.isArray(value)) {
    return {
      markdown: toArrayMarkdown(value),
      metadataRows,
      rawJson,
    };
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

    for (const [key, entryValue] of entries) {
      if (!isScalar(entryValue)) {
        continue;
      }
      metadataRows.push({
        title: humanizeKey(key),
        text: summarizeValue(entryValue),
      });

      if (metadataRows.length >= 10) {
        break;
      }
    }

    return {
      markdown: toObjectMarkdown(value),
      metadataRows,
      rawJson,
    };
  }

  metadataRows.push({ title: "Value", text: summarizeValue(value) });
  return {
    markdown: toScalarMarkdown(value),
    metadataRows,
    rawJson,
  };
}

function toObjectMarkdown(value: Record<string, unknown>): string {
  const entries = Object.entries(value);
  const overview = entries.slice(0, MAX_OBJECT_FIELDS).map(([key, entryValue]) => {
    return `- **${humanizeKey(key)}**: ${summarizeValue(entryValue)}`;
  });

  const hiddenCount = Math.max(entries.length - MAX_OBJECT_FIELDS, 0);
  const lines = ["# Result", ...overview];

  if (hiddenCount > 0) {
    lines.push(`- **More Fields**: ${hiddenCount} additional field(s)`);
  }

  return lines.join("\n");
}

function toArrayMarkdown(value: unknown[]): string {
  const lines = ["# Result List", `- **Items**: ${value.length}`];

  if (value.length === 0) {
    lines.push("\nNo items returned.");
    return lines.join("\n");
  }

  lines.push("\n## Preview");
  for (const [index, item] of value.slice(0, MAX_ARRAY_ITEMS).entries()) {
    lines.push(`${index + 1}. ${summarizeValue(item)}`);
  }

  const hidden = value.length - MAX_ARRAY_ITEMS;
  if (hidden > 0) {
    lines.push(`\n${hidden} more item(s) not shown in preview.`);
  }

  return lines.join("\n");
}

function toScalarMarkdown(value: unknown): string {
  return ["# Result", summarizeValue(value)].join("\n\n");
}

function summarizeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_PREVIEW ? `${value.slice(0, MAX_STRING_PREVIEW)}...` : value;
  }

  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }

  if (isRecord(value)) {
    const pairs: string[] = [];
    for (const [key, entryValue] of Object.entries(value)) {
      if (!isScalar(entryValue)) {
        continue;
      }
      pairs.push(`${humanizeKey(key)}: ${summarizeValue(entryValue)}`);
      if (pairs.length >= 3) {
        break;
      }
    }

    if (pairs.length > 0) {
      return pairs.join(" | ");
    }

    return `${Object.keys(value).length} field(s)`;
  }

  return String(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
