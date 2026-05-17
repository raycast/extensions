export type HistoryItem = {
  id: string;
  timestamp: string;
  mode: string;
  source: string;
  summary: string;
  raw: string;
};

export type PackageRecord = {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  enabled: string;
  modeId: string;
  modeName: string;
  language: string;
  translate: string;
  prompt: string;
  vocabulary: string;
  replacements: string;
  appBindings: string;
  metadata: Record<string, string>;
  raw: string;
};

export function parseHistoryItems(output: string): HistoryItem[] {
  const items: HistoryItem[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(
      /^#(?<id>\d+)\s+\[(?<timestamp>[^\]]+)\]\s+\((?<mode>.+?)\/(?<source>voice|text|transcribe)(?:\s+llm=(?<llmInline>[^\s)]+))?(?:\s+reprocessed=(?<reprocessedInline>[^\s)]+))?\)\s*(?:\[(?<extra>[^\]]+)\]\s*)?(?<summary>.*)$/,
    );

    if (!match?.groups) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        lastItem.summary = [lastItem.summary, line].filter(Boolean).join("\n");
        lastItem.raw = [lastItem.raw, line].filter(Boolean).join("\n");
      } else {
        items.push({
          id: "unknown",
          timestamp: "",
          mode: "Unknown",
          source: "unknown",
          summary: line,
          raw: line,
        });
      }
      continue;
    }

    items.push({
      id: match.groups.id,
      timestamp: match.groups.timestamp,
      mode: match.groups.mode,
      source: match.groups.source,
      summary: match.groups.summary,
      raw: line,
    });
  }

  return items;
}

export function parsePackageRecord(output: string): PackageRecord {
  const record: PackageRecord = {
    id: "",
    name: "",
    author: "",
    version: "",
    description: "",
    enabled: "",
    modeId: "",
    modeName: "",
    language: "",
    translate: "",
    prompt: "",
    vocabulary: "",
    replacements: "",
    appBindings: "",
    metadata: {},
    raw: output,
  };

  let currentKey = "";

  for (const rawLine of output.split("\n")) {
    if (/^\d{4}\//.test(rawLine)) {
      continue;
    }

    const line = rawLine.trimEnd();
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match && shouldStartPackageRecordField(match[1].trim(), currentKey)) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^"|"$/g, "");
      currentKey = key;
      record.metadata[key] = value;
      applyPackageRecordValue(record, key, value);
      continue;
    }

    if (currentKey) {
      const appendedValue = [record.metadata[currentKey], trimmedLine]
        .filter(Boolean)
        .join("\n");
      record.metadata[currentKey] = appendedValue;
      applyPackageRecordValue(record, currentKey, appendedValue);
    }
  }

  return record;
}

export function parseImportedHistoryId(text: string) {
  const patterns = [
    /\bhistory(?:\s+item)?(?:\s+id)?\s*[:=]?\s*#(?<id>\d+)\b/i,
    /\bhistory(?:\s+item)?(?:\s+id)?\s*[:=]?\s*(?<id>\d+)\b/i,
    /\bitem\s*#(?<id>\d+)\b/i,
    /\bid\s*[:=]?\s*(?<id>\d+)\b/i,
    /#(?<id>\d+)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.groups?.id) {
      return match.groups.id;
    }
  }

  return undefined;
}

export function normalizeHistoryComparisonText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function importedHistoryItemWasCreated(
  importedText: string,
  parsedItems: HistoryItem[],
  baselineIds: string[],
) {
  const normalizedImported = normalizeHistoryComparisonText(importedText);
  if (!normalizedImported) {
    return false;
  }

  const importedPrefix = normalizedImported.slice(0, 120);
  const baselineIdSet = new Set(baselineIds);

  return parsedItems.some((item) => {
    if (baselineIdSet.has(item.id)) {
      return false;
    }

    const normalizedSummary = normalizeHistoryComparisonText(item.summary);
    return (
      normalizedSummary === normalizedImported ||
      normalizedSummary.startsWith(importedPrefix) ||
      importedPrefix.startsWith(normalizedSummary)
    );
  });
}

function shouldStartPackageRecordField(key: string, currentKey: string) {
  if (isKnownPackageRecordField(key)) {
    return true;
  }

  return !isMultilinePackageRecordField(currentKey);
}

function isKnownPackageRecordField(key: string) {
  return [
    "id",
    "name",
    "author",
    "version",
    "description",
    "enabled",
    "mode_id",
    "mode_name",
    "language",
    "translate",
    "prompt",
    "vocabulary",
    "replacements",
    "app_bindings",
  ].includes(key);
}

function isMultilinePackageRecordField(key: string) {
  return ["description", "prompt", "vocabulary", "replacements"].includes(key);
}

function applyPackageRecordValue(
  record: PackageRecord,
  key: string,
  value: string,
) {
  switch (key) {
    case "id":
      record.id = value;
      break;
    case "name":
      record.name = value;
      break;
    case "author":
      record.author = value;
      break;
    case "version":
      record.version = value;
      break;
    case "description":
      record.description = value;
      break;
    case "enabled":
      record.enabled = value;
      break;
    case "mode_id":
      record.modeId = value;
      break;
    case "mode_name":
      record.modeName = value;
      break;
    case "language":
      record.language = value;
      break;
    case "translate":
      record.translate = value;
      break;
    case "prompt":
      record.prompt = value;
      break;
    case "vocabulary":
      record.vocabulary = value;
      break;
    case "replacements":
      record.replacements = value;
      break;
    case "app_bindings":
      record.appBindings = value;
      break;
    default:
      break;
  }
}
