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

/**
 * The create form additionally renders personal-name (person Name),
 * actor-reference (deal Owner, required), and single record links (a person's
 * Company). Multiselect record links, location, and interaction stay
 * Attio-only — no async-search multiselect control exists.
 */
const CREATABLE_TYPES = new Set([...EDITABLE_TYPES, "personal-name", "actor-reference"]);
export const creatableAttributes = (attributes: Attribute[]): Attribute[] =>
  attributes.filter(
    (a) =>
      a.is_writable &&
      !a.is_archived &&
      (CREATABLE_TYPES.has(a.type) || (a.type === "record-reference" && !a.is_multiselect)),
  );

/**
 * A checkbox's static workspace default, so the create form can DISPLAY the
 * value Attio would apply — an untouched box is omitted from the POST and the
 * default wins; the form must show that outcome, not an unchecked lie.
 */
export function staticCheckboxDefault(a: Attribute): boolean | undefined {
  if (!a.is_default_value_enabled || a.default_value?.type !== "static") return undefined;
  const t = a.default_value.template?.[0];
  return t && t.attribute_type === "checkbox" && typeof t.value === "boolean" ? t.value : undefined;
}

/**
 * The edit form's additional supported types beyond EDITABLE_TYPES: names,
 * owners, and record links, each with bespoke controls. Single-select only —
 * there's no async-search multiselect control. Location and interaction stay
 * Attio-only.
 */
const DEFERRED_EDITABLE = new Set(["personal-name", "actor-reference", "record-reference"]);
export const deferredEditableAttributes = (attributes: Attribute[]): Attribute[] =>
  attributes.filter((a) => a.is_writable && !a.is_archived && !a.is_multiselect && DEFERRED_EDITABLE.has(a.type));

/**
 * "First … Last" → Attio's object syntax (all three fields required). A single
 * token or an explicit "Last, First" uses the string syntax Attio parses.
 */
export function personalNameToWire(input: string): unknown[] {
  // Pasted names often carry NBSP/narrow-NBSP — normalize so splitting works.
  const s = input.replace(/[\u00A0\u202F]/g, " ").trim();
  if (s === "") return [];
  if (s.includes(",") || !s.includes(" ")) return [s];
  const parts = s.split(/\s+/);
  const last_name = parts[parts.length - 1];
  return [{ first_name: parts.slice(0, -1).join(" "), last_name, full_name: s }];
}

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

/**
 * Bare hostname with a real TLD — no protocol, path, or spaces. Labels can't
 * start or end with a hyphen; the TLD is alphabetic or punycode (xn--).
 */
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const DOMAIN_RE = new RegExp(`^(?:${LABEL}\\.)+(?:[a-z]{2,63}|xn--[a-z0-9]{2,59})$`, "i");
const assertDomain = (a: Attribute) => (s: string) => {
  if (!DOMAIN_RE.test(s)) throw new Error(`"${s}" isn't a valid domain for ${a.title} (e.g. attio.com)`);
};

/** Form control value → wire array for PUT values. Throws with a user-facing message on invalid input. */
export function toWireValue(a: Attribute, formValue: unknown): unknown[] {
  const split = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  // TagPicker values (any multiselect: select/status options, or free-text
  // tag inputs like domains/emails) arrive as arrays — pass the exact strings
  // through: a trim would change the option identifier the API resolves
  // against. A single-value type receiving an array is a caller bug.
  if (Array.isArray(formValue)) {
    if (!a.is_multiselect) throw new Error(`${a.title} must be a single value`);
    const out = formValue.filter((x): x is string => typeof x === "string" && x !== "");
    if (a.type === "domain") out.forEach(assertDomain(a));
    return out;
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
      const out = a.is_multiselect ? split(s) : [s];
      if (a.type === "domain") out.forEach(assertDomain(a));
      return out;
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
