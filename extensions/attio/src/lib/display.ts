import type { AttioObject, AttioRecord } from "../api/types";
import { formatValue, formatValues, shortId } from "./format";

/** Human-readable object label; falls through plural → singular → slug. */
export const getObjectTitle = (o: AttioObject) => o.plural_noun || o.singular_noun || o.api_slug || "";

/**
 * Known display attributes for standard objects (spec §8.6) — a first choice,
 * not a model: everything else falls through to the generic heuristic, so
 * custom objects and workspaces without deals still work.
 */
export const DISPLAY: Record<string, { title: string; subtitle?: string }> = {
  people: { title: "name", subtitle: "email_addresses" },
  companies: { title: "name", subtitle: "domains" },
  deals: { title: "name", subtitle: "stage" },
};

/** Title: known attribute → first personal-name → `name` slug → first text → first domain → shortId. */
export function recordTitle(record: AttioRecord, objectSlug: string): string {
  const known = DISPLAY[objectSlug]?.title;
  if (known && record.values[known]?.length) return formatValues(record.values[known]);
  for (const wanted of ["personal-name"] as const) {
    for (const vs of Object.values(record.values)) {
      if (vs[0]?.attribute_type === wanted) return formatValue(vs[0]);
    }
  }
  if (record.values.name?.length) return formatValues(record.values.name);
  for (const vs of Object.values(record.values)) {
    if (vs[0]?.attribute_type === "text" && vs[0].value) return vs[0].value;
  }
  for (const vs of Object.values(record.values)) {
    if (vs[0]?.attribute_type === "domain") return vs[0].domain;
  }
  return shortId(record.id.record_id);
}

export function recordSubtitle(record: AttioRecord, objectSlug: string): string | undefined {
  const known = DISPLAY[objectSlug]?.subtitle;
  if (known && record.values[known]?.length) return formatValues(record.values[known]);
  return undefined;
}

/** Server-side sort choices per object (spec round-4b §3) — pure data, no api imports. */
export const SORT_OPTIONS: Record<string, Array<{ title: string; attribute: string; direction: "asc" | "desc" }>> = {
  companies: [
    { title: "Last Interaction", attribute: "last_interaction", direction: "desc" },
    { title: "Connection Strength", attribute: "strongest_connection_strength", direction: "desc" },
    { title: "Alphabetical", attribute: "name", direction: "asc" },
    { title: "Date Added", attribute: "created_at", direction: "desc" },
  ],
  people: [
    { title: "Connection Strength", attribute: "strongest_connection_strength", direction: "desc" },
    { title: "Last Email Interaction", attribute: "last_email_interaction", direction: "desc" },
    { title: "Last Calendar Interaction", attribute: "last_calendar_interaction", direction: "desc" },
    { title: "Alphabetical", attribute: "name", direction: "asc" },
    { title: "Date Added", attribute: "created_at", direction: "desc" },
  ],
  deals: [
    { title: "Date Added", attribute: "created_at", direction: "desc" },
    { title: "Deal Value", attribute: "value", direction: "desc" },
    { title: "Alphabetical", attribute: "name", direction: "asc" },
  ],
};
