import type { AttributeValue } from "../api/types";

export type FormatContext = {
  /** Resolves a workspace-member actor id to a display name (hooks provide it). */
  memberName?: (actorId: string) => string | undefined;
};

export const shortId = (id: string) => id.slice(0, 8);

const DASH = "—";

const numOrDash = (n: unknown): string => (typeof n === "number" && Number.isFinite(n) ? String(n) : DASH);

/**
 * Exhaustive over the generated 19-variant union (17 discriminants; status and
 * select appear twice — spec §8.1). The `never` default makes a NEW attribute
 * type a compile error after `npm run types`, not a "?" on screen.
 * Secondary narrowing inside status/select is required: discriminants alone
 * leave `{x: string} | {x: object}` (spec §8.1) — that union is why the old
 * code rendered "[object Object]".
 */
export function formatValue(v: AttributeValue, ctx: FormatContext = {}): string {
  switch (v.attribute_type) {
    case "text":
    case "date":
    case "timestamp":
      return v.value || DASH;
    case "number":
    case "rating":
      return numOrDash(v.value);
    case "checkbox":
      return v.value ? "Yes" : "No";
    case "currency":
      if (typeof v.currency_value !== "number" || !Number.isFinite(v.currency_value)) return DASH;
      return v.currency_code
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: v.currency_code }).format(v.currency_value)
        : String(v.currency_value);
    case "domain":
      return v.domain;
    case "email-address":
      return v.email_address;
    case "phone-number":
      return v.phone_number;
    case "personal-name":
      return v.full_name?.trim() ? v.full_name : DASH;
    case "location": {
      const parts = [v.line_1, v.locality, v.region, v.country_code].filter((p): p is string => !!p);
      return parts.length ? parts.join(", ") : DASH;
    }
    case "interaction":
      return v.interacted_at ?? DASH;
    case "record-reference":
      // Detail views resolve real titles via useRecordTitles; this is the
      // spec §8.2 fallback shape: object · shortId, never a bare UUID.
      return `${v.target_object} · ${shortId(v.target_record_id)}`;
    case "actor-reference":
      if (!v.referenced_actor_id) return DASH;
      return ctx.memberName?.(v.referenced_actor_id) ?? shortId(v.referenced_actor_id);
    case "status": {
      const s = v.status;
      if (s && typeof s === "object" && "title" in s) return s.title; // live shape (spec §14)
      if (typeof s === "string") return shortId(s);
      return DASH;
    }
    case "select": {
      const o = v.option;
      if (o && typeof o === "object" && "title" in o) return o.title;
      if (typeof o === "string") return shortId(o);
      return DASH;
    }
    default: {
      const _exhaustive: never = v;
      throw new Error(`Unhandled attribute type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function formatValues(vs: AttributeValue[], ctx: FormatContext = {}): string {
  if (!vs.length) return DASH;
  return vs.map((v) => formatValue(v, ctx)).join(", ");
}

export function getRecordReferences(
  values: Record<string, AttributeValue[]>,
): Array<{ target_object: string; target_record_id: string }> {
  const out: Array<{ target_object: string; target_record_id: string }> = [];
  for (const vs of Object.values(values)) {
    for (const v of vs) {
      if (v.attribute_type === "record-reference")
        out.push({ target_object: v.target_object, target_record_id: v.target_record_id });
    }
  }
  return out;
}

type RecordReferenceValue = Extract<AttributeValue, { attribute_type: "record-reference" }>;

/**
 * Every record-reference value across all attributes, bucketed by
 * `target_object` and deduped by `target_record_id` (spec round-9 §1) — the
 * generalized replacement for per-slug relation attribute maps. Pure/api-free.
 */
export function referencesByObject(values: Record<string, AttributeValue[]>): Record<string, RecordReferenceValue[]> {
  const out: Record<string, RecordReferenceValue[]> = {};
  const seen: Record<string, Set<string>> = {};
  for (const vs of Object.values(values)) {
    for (const v of vs) {
      if (v.attribute_type !== "record-reference") continue;
      const seenIds = (seen[v.target_object] ??= new Set());
      if (seenIds.has(v.target_record_id)) continue;
      seenIds.add(v.target_record_id);
      (out[v.target_object] ??= []).push(v);
    }
  }
  return out;
}
