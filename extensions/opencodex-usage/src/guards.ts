/**
 * Runtime shape checks for OpenCodex responses.
 *
 * The proxy serves dashboard HTML for unknown `/api/*` paths and older versions answer with
 * differently shaped payloads, so a successful response is not automatically usable. These guards
 * cover exactly the fields the commands dereference, sort or scale by, and let anything optional
 * stay absent, so a newer server adding fields keeps working.
 */
import type { ConfigResponse, ProviderInfo, ProviderQuotasResponse, UsageResponse } from "./api";

export type Guard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every entry of an optional array field must match, but the field itself may be absent. */
function isOptionalArrayOf(value: unknown, matches: (entry: unknown) => boolean): boolean {
  if (value === undefined || value === null) return true;
  return Array.isArray(value) && value.every(matches);
}

function hasStringField(value: unknown, field: string): boolean {
  return isRecord(value) && typeof value[field] === "string";
}

/** Rows are sorted, filtered and scaled by these counters, so a non-number would skew the view. */
function hasFiniteField(value: unknown, field: string): boolean {
  const candidate = isRecord(value) ? value[field] : undefined;
  return typeof candidate === "number" && Number.isFinite(candidate);
}

function isUsageRow(value: unknown, ...idFields: string[]): boolean {
  return (
    idFields.every((field) => hasStringField(value, field)) &&
    hasFiniteField(value, "requests") &&
    hasFiniteField(value, "totalTokens")
  );
}

// Quota reports are keyed and titled by `provider`. `quota` is optional, but when present it must
// be an object: `buildQuotaRows` reads window fields off it and a primitive would silently render
// the provider as having no quota at all.
export const isProviderQuotasResponse: Guard<ProviderQuotasResponse> = (value): value is ProviderQuotasResponse =>
  isRecord(value) &&
  Array.isArray(value.reports) &&
  value.reports.every(
    (report) =>
      hasStringField(report, "provider") &&
      isRecord(report) &&
      (report.quota === undefined || report.quota === null || isRecord(report.quota)),
  );

export const isProviderInfoList: Guard<ProviderInfo[]> = (value): value is ProviderInfo[] =>
  Array.isArray(value) && value.every((entry) => hasStringField(entry, "name"));

export const isConfigResponse: Guard<ConfigResponse> = (value): value is ConfigResponse =>
  isRecord(value) && (value.defaultProvider === undefined || typeof value.defaultProvider === "string");

// Usage rows are grouped by these ids and sorted by their counters.
export const isUsageResponse: Guard<UsageResponse> = (value): value is UsageResponse =>
  isRecord(value) &&
  (value.summary === undefined || isRecord(value.summary)) &&
  isOptionalArrayOf(value.providers, (entry) => isUsageRow(entry, "provider")) &&
  isOptionalArrayOf(value.models, (entry) => isUsageRow(entry, "provider", "model")) &&
  isOptionalArrayOf(
    value.days,
    (entry) =>
      isUsageRow(entry, "date") &&
      isRecord(entry) &&
      isOptionalArrayOf(entry.models, (model) => isUsageRow(model, "provider", "model")),
  );
