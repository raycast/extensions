import type { JsonPrimitive, JsonValue } from "./types";
import type { QuotaMap, RawReading } from "../types/device";

export function normalizeQuotaResponse(input: Record<string, JsonValue>): QuotaMap {
  const output: QuotaMap = {};

  function visit(value: JsonValue, path: string): void {
    if (Array.isArray(value)) {
      output[path] = JSON.stringify(value);
      return;
    }

    if (value !== null && typeof value === "object") {
      for (const [key, nestedValue] of Object.entries(value)) {
        visit(nestedValue, path ? `${path}.${key.trim()}` : key.trim());
      }
      return;
    }

    output[path] = value;
  }

  for (const [key, value] of Object.entries(input)) {
    visit(value, key.trim());
  }

  return output;
}

export function readQuota(quotas: QuotaMap, aliases: readonly string[]): JsonPrimitive | undefined {
  for (const alias of aliases) {
    if (Object.hasOwn(quotas, alias)) return quotas[alias];
  }

  const entries = Object.entries(quotas);
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase();
    const canonicalAlias = canonicalQuotaKey(alias);
    const match = entries.find(([key]) => {
      const normalizedKey = key.toLowerCase();
      const canonicalKey = canonicalQuotaKey(key);
      return (
        normalizedKey === normalizedAlias ||
        normalizedKey.endsWith(`.${normalizedAlias}`) ||
        canonicalKey === canonicalAlias ||
        canonicalKey.endsWith(canonicalAlias)
      );
    });
    if (match) return match[1];
  }

  return undefined;
}

function canonicalQuotaKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function readNumber(quotas: QuotaMap, aliases: readonly string[]): number | undefined {
  return toNumber(readQuota(quotas, aliases));
}

export function readBoolean(quotas: QuotaMap, aliases: readonly string[]): boolean | undefined {
  const value = readQuota(quotas, aliases);
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "on", "open", "enabled"].includes(normalized)) return true;
  if (["0", "false", "off", "closed", "disabled"].includes(normalized)) return false;
  return undefined;
}

export function findNumber(quotas: QuotaMap, patterns: readonly RegExp[]): number | undefined {
  const candidates = Object.entries(quotas)
    .map(([key, value]) => ({ key, value: toNumber(value) }))
    .filter((entry): entry is { key: string; value: number } => entry.value !== undefined);

  for (const pattern of patterns) {
    const match = candidates.find(({ key }) => pattern.test(key));
    if (match) return match.value;
  }

  return undefined;
}

export function toNumber(value: JsonPrimitive | undefined): number | undefined {
  if (value === undefined || value === null || typeof value === "boolean") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function listRawReadings(quotas: QuotaMap): RawReading[] {
  return Object.entries(quotas)
    .map(([key, value]) => ({ key, value, relevance: readingRelevance(key) }))
    .sort((left, right) => right.relevance - left.relevance || left.key.localeCompare(right.key));
}

function readingRelevance(key: string): number {
  const normalized = key.toLowerCase();
  let score = 0;
  if (/(^|\.)(soc|batterypercentage|batsoc)$/.test(normalized)) score += 100;
  if (/(watt|power|load|grid|input|output|pv)/.test(normalized)) score += 60;
  if (/(remain|charge|discharge|state|status|switch|enabled|mode|limit|priority)/.test(normalized)) score += 40;
  if (/(temp|volt|amp|current|freq)/.test(normalized)) score += 20;
  return score;
}
