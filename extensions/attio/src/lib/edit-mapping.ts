import type { Attribute, AttributeValue } from "../api/types";
import { formatValue } from "./format";

/** Types the 2.0 form can edit; the rest render read-only (spec §8.6 table). */
const EDITABLE_TYPES = new Set([
  "text",
  "number",
  "currency",
  "checkbox",
  "date",
  "timestamp",
  "rating",
  "select",
  "status",
  "email-address",
  "phone-number",
  "domain",
]);

export const editableAttributes = (attributes: Attribute[]): Attribute[] =>
  attributes.filter((a) => a.is_writable && !a.is_archived && EDITABLE_TYPES.has(a.type));

/** Current value → form control value. Multiselects join with ", ". */
export function initialFieldValue(
  a: Attribute,
  values: Record<string, AttributeValue[]>,
): string | string[] | boolean | Date | null {
  const vs = values[a.api_slug] ?? [];
  if (a.type === "checkbox") return vs[0]?.attribute_type === "checkbox" ? vs[0].value : false;
  if (a.type === "date" || a.type === "timestamp") {
    const first = vs[0];
    return first && "value" in first && typeof first.value === "string" ? new Date(first.value) : null;
  }
  // Multiselect select/status render as TagPickers, which take arrays — a
  // joined "A, B" string is not an option and breaks titles containing commas.
  if (a.is_multiselect && (a.type === "select" || a.type === "status")) return vs.map((v) => formatValue(v));
  return vs.map((v) => formatValue(v)).join(", ");
}

/** Form control value → wire array for PUT values. Throws with a user-facing message on invalid input. */
export function toWireValue(a: Attribute, formValue: unknown): unknown[] {
  const split = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  // TagPicker values (multiselect select/status) arrive as arrays — pass the
  // exact strings through: a trim would change the option identifier the API
  // resolves against. Any other type receiving an array is a caller bug.
  if (Array.isArray(formValue)) {
    if (!(a.is_multiselect && (a.type === "select" || a.type === "status")))
      throw new Error(`${a.title} must be a single value`);
    return formValue.filter((x): x is string => typeof x === "string" && x !== "");
  }
  switch (a.type) {
    case "checkbox":
      return [Boolean(formValue)];
    case "number":
    case "rating":
    case "currency": {
      const s = String(formValue).trim();
      if (s === "") return [];
      // Prefills use Intl currency formatting ("€1,234.56", "CA$1,000") and
      // String(number) for numbers (which can be scientific notation). Accept
      // exactly: optional edge currency symbols/codes and an en-US number —
      // comma only as a strict 3-digit group separator. Anything else must
      // throw, not be squashed into a different number: "12/34" must never
      // save as 1234, and decimal-comma "1.234,56" must never save as 1.23456.
      // Decorations must look like real currency tokens ("$", "\u20AC", "CA$",
      // "CHF", "EUR") \u2014 arbitrary letters would turn "12k" into 12 and
      // "1 million" into 1. Whitespace is legal only between a decoration and
      // the number, never inside it ("1,2 34" must not repair to 1234).
      const WS = "[\\s\\u00A0\\u202F]*";
      const m = s.match(
        new RegExp(
          `^([+-]?)(?:(?:[A-Z]{1,3}\\p{Sc}|[A-Z]{3}|\\p{Sc})${WS})?` +
            `([+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+|(?=\\.))(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)` +
            `(?:${WS}(?:\\p{Sc}|[A-Z]{3}))?$`,
          "u",
        ),
      );
      const core = m ? m[2].replace(/,/g, "") : "";
      const n = m ? Number(m[1] + core) : NaN;
      // A nonzero mantissa that parses to 0 underflowed ("1e-324") \u2014 saving a
      // silent 0 for it would corrupt the amount. A real "0"/"0.00" still saves.
      const underflow = n === 0 && /[1-9]/.test(core.split(/[eE]/)[0]);

      if (!Number.isFinite(n) || underflow) throw new Error(`${a.title} must be a number`);
      return [n];
    }
    case "date": {
      if (!formValue) return [];
      return [(formValue as Date).toISOString().slice(0, 10)];
    }
    case "timestamp": {
      if (!formValue) return [];
      return [(formValue as Date).toISOString()];
    }
    default: {
      const s = String(formValue ?? "").trim();
      if (s === "") return [];
      return a.is_multiselect ? split(s) : [s];
    }
  }
}

/** Diff two form snapshots; only changed keys reach the wire (PUT overwrites provided attributes only). */
export function changedValues(
  initial: Record<string, unknown>,
  current: Record<string, unknown>,
  attributes: Attribute[],
): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const a of attributes) {
    const before = initial[a.api_slug];
    const after = current[a.api_slug];
    const same =
      before === after ||
      (before instanceof Date && after instanceof Date && before.getTime() === after.getTime()) ||
      (Array.isArray(before) && Array.isArray(after) && JSON.stringify(before) === JSON.stringify(after));
    if (!same) out[a.api_slug] = toWireValue(a, after);
  }
  return out;
}
