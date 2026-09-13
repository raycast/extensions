import type { Aggregate, SourceResult, UnreadCountResult } from "./unread-count";

export type UnreadSnapshot = { result: UnreadCountResult; readAt: Date };

export function serializeUnreadSnapshot(snapshot: UnreadSnapshot): string {
  return JSON.stringify({ result: snapshot.result, readAt: snapshot.readAt.toISOString() });
}

export function parseUnreadSnapshot(raw: string | undefined): UnreadSnapshot | undefined {
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  const envelope = parsed as Record<string, unknown>;

  const result = parseUnreadCountResult(envelope.result);
  if (!result) return undefined;
  if (typeof envelope.readAt !== "string") return undefined;
  const readAt = new Date(envelope.readAt);
  if (Number.isNaN(readAt.getTime())) return undefined;
  return { result, readAt };
}

function parseUnreadCountResult(value: unknown): UnreadCountResult | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.sources)) return undefined;

  const sources: SourceResult[] = [];
  for (const entry of record.sources) {
    const source = parseSourceResult(entry);
    if (!source) return undefined;
    sources.push(source);
  }

  const aggregate = parseAggregate(record.aggregate);
  if (!aggregate) return undefined;
  return { sources, aggregate };
}

function parseSourceResult(value: unknown): SourceResult | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim() === "") return undefined;
  if (typeof record.name !== "string" || record.name.trim() === "") return undefined;
  if (typeof record.openCommand !== "string") return undefined;
  if (typeof record.label !== "string" || record.label === "") return undefined;
  if (typeof record.unavailable !== "boolean") return undefined;
  if (record.appPath !== undefined && typeof record.appPath !== "string") return undefined;
  if (record.contribution !== undefined && typeof record.contribution !== "number") return undefined;

  return {
    id: record.id,
    name: record.name,
    ...(record.appPath !== undefined ? { appPath: record.appPath } : {}),
    openCommand: record.openCommand,
    label: record.label,
    ...(record.contribution !== undefined ? { contribution: record.contribution } : {}),
    unavailable: record.unavailable,
  };
}

function parseAggregate(value: unknown): Aggregate | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;

  switch (record.kind) {
    case "complete":
    case "partial": {
      if (typeof record.total !== "number") return undefined;
      if (record.hasExcludedUnreadActivity !== undefined && typeof record.hasExcludedUnreadActivity !== "boolean") {
        return undefined;
      }
      return {
        kind: record.kind,
        total: record.total,
        ...(record.hasExcludedUnreadActivity ? { hasExcludedUnreadActivity: true } : {}),
      };
    }
    case "empty":
    case "noSources":
    case "failed":
    case "accessibilityRequired":
    case "automationRequired":
      return { kind: record.kind };
    default:
      return undefined;
  }
}
