import { describe, expect, it } from "vitest";
import type { Attribute, AttributeValue } from "../api/types";
import { changedValues, editableAttributes, initialFieldValue, toWireValue } from "./edit-mapping";

const attr = (x: Partial<Attribute>): Attribute =>
  ({
    id: { workspace_id: "w", object_id: "o", attribute_id: "a" },
    title: "T",
    description: null,
    api_slug: "slug",
    type: "text",
    is_system_attribute: false,
    is_writable: true,
    is_required: false,
    is_unique: false,
    is_multiselect: false,
    is_default_value_enabled: false,
    is_archived: false,
    default_value: null,
    relationship: null,
    created_at: "2026-01-01T00:00:00Z",
    config: {},
    ...x,
  }) as unknown as Attribute;

const meta = {
  active_from: "2026-01-01T00:00:00Z",
  active_until: null,
  created_by_actor: { id: null, type: "system" },
};
const v = (x: Record<string, unknown>) => ({ ...meta, ...x }) as unknown as AttributeValue;

describe("editableAttributes", () => {
  it("keeps only writable, non-archived, supported types (spec §8.6 table)", () => {
    const list = [
      attr({ api_slug: "ok_text", type: "text" }),
      attr({ api_slug: "not_writable", is_writable: false }),
      attr({ api_slug: "archived", is_archived: true }),
      attr({ api_slug: "deferred_ref", type: "record-reference" }),
      attr({ api_slug: "deferred_name", type: "personal-name" }),
      attr({ api_slug: "ok_status", type: "status" }),
    ];
    expect(editableAttributes(list).map((a) => a.api_slug)).toEqual(["ok_text", "ok_status"]);
  });
});

describe("initialFieldValue / toWireValue round-trip", () => {
  it("text", () => {
    const a = attr({ api_slug: "t", type: "text" });
    expect(initialFieldValue(a, { t: [v({ attribute_type: "text", value: "hi" })] })).toBe("hi");
    expect(toWireValue(a, "hi")).toEqual(["hi"]);
    expect(toWireValue(a, "")).toEqual([]); // cleared
  });
  it("number rejects NaN", () => {
    const a = attr({ api_slug: "n", type: "number" });
    expect(toWireValue(a, "42")).toEqual([42]);
    expect(() => toWireValue(a, "forty-two")).toThrow(/number/i);
  });
  it("currency strips any Intl-formatted symbol, not just $", () => {
    const a = attr({ api_slug: "v", type: "currency" });
    expect(toWireValue(a, "$1,234.56")).toEqual([1234.56]);
    expect(toWireValue(a, "€1,234.56")).toEqual([1234.56]);
    expect(toWireValue(a, "£99")).toEqual([99]);
    expect(toWireValue(a, "CA$1,000")).toEqual([1000]);
    expect(toWireValue(a, "-¥500")).toEqual([-500]);
    expect(() => toWireValue(a, "abc")).toThrow(/number/i);
  });
  it("number keeps scientific notation and rejects mixed garbage instead of squashing it", () => {
    const a = attr({ api_slug: "n", type: "number" });
    expect(toWireValue(a, "1e3")).toEqual([1000]);
    expect(toWireValue(a, "1e+21")).toEqual([1e21]);
    expect(toWireValue(a, "2e-7")).toEqual([2e-7]);
    expect(() => toWireValue(a, "12/34")).toThrow(/number/i);
    expect(() => toWireValue(a, "12abc34")).toThrow(/number/i);
  });
  it("currency rejects decimal-comma formats instead of misparsing them", () => {
    const a = attr({ api_slug: "v", type: "currency" });
    expect(toWireValue(a, "1,234.56")).toEqual([1234.56]);
    expect(toWireValue(a, "1,234,567.89")).toEqual([1234567.89]);
    expect(() => toWireValue(a, "1.234,56 €")).toThrow(/number/i); // must NOT save 1.23456
    expect(() => toWireValue(a, "1,56")).toThrow(/number/i); // ambiguous European decimal
    expect(() => toWireValue(a, "12,34.56")).toThrow(/number/i); // malformed grouping
  });
  it("currency accepts code-spaced Intl output and decimal shorthand, rejects magnitude words", () => {
    const a = attr({ api_slug: "v", type: "currency" });
    expect(toWireValue(a, "CHF 1,234.56")).toEqual([1234.56]);
    expect(toWireValue(a, "SEK 500")).toEqual([500]);
    expect(toWireValue(a, "100 EUR")).toEqual([100]);
    expect(toWireValue(a, ".5")).toEqual([0.5]);
    expect(toWireValue(a, "-.5")).toEqual([-0.5]);
    expect(toWireValue(a, "1.")).toEqual([1]);
    expect(() => toWireValue(a, "12k")).toThrow(/number/i); // must NOT save 12
    expect(() => toWireValue(a, "1 million")).toThrow(/number/i); // must NOT save 1
    expect(() => toWireValue(a, "1,2 34")).toThrow(/number/i); // internal space must not repair
    expect(() => toWireValue(a, "1e")).toThrow(/number/i);
    expect(() => toWireValue(a, "1eUSD")).toThrow(/number/i);
    expect(() => toWireValue(a, "1e-324")).toThrow(/number/i); // must NOT underflow to 0
    expect(toWireValue(a, "1e100")).toEqual([1e100]); // large finite exponents are valid numbers
    expect(toWireValue(a, "1e-100")).toEqual([1e-100]);
    expect(toWireValue(a, "0")).toEqual([0]); // a real zero still saves
    expect(toWireValue(a, "0.00")).toEqual([0]);
  });
  it("multiselect select round-trips as arrays (commas in titles survive)", () => {
    const a = attr({ api_slug: "tags", type: "select", is_multiselect: true });
    expect(toWireValue(a, ["Alpha", "Beta, Inc."])).toEqual(["Alpha", "Beta, Inc."]);
    expect(toWireValue(a, [])).toEqual([]);
    // unchanged arrays must not count as edits
    expect(changedValues({ tags: ["A", "B"] }, { tags: ["A", "B"] }, [a])).toEqual({});
    expect(changedValues({ tags: ["A"] }, { tags: ["A", "B"] }, [a])).toEqual({ tags: ["A", "B"] });
  });
  it("checkbox", () => {
    const a = attr({ api_slug: "c", type: "checkbox" });
    expect(toWireValue(a, true)).toEqual([true]);
  });
  it("date trims to YYYY-MM-DD; timestamp keeps ISO", () => {
    const d = new Date("2026-03-04T05:06:07.000Z");
    expect(toWireValue(attr({ api_slug: "d", type: "date" }), d)).toEqual(["2026-03-04"]);
    expect(toWireValue(attr({ api_slug: "ts", type: "timestamp" }), d)).toEqual(["2026-03-04T05:06:07.000Z"]);
  });
  it("status/select write the option title string", () => {
    expect(toWireValue(attr({ api_slug: "s", type: "status" }), "Negotiation")).toEqual(["Negotiation"]);
  });
  it("multiselect email splits comma-separated input", () => {
    const a = attr({ api_slug: "e", type: "email-address", is_multiselect: true });
    expect(toWireValue(a, "a@b.co, c@d.co")).toEqual(["a@b.co", "c@d.co"]);
  });
});

describe("changedValues — only diffs go on the wire (PUT semantics, spec §8.6)", () => {
  const attrs = [attr({ api_slug: "kept", type: "text" }), attr({ api_slug: "edited", type: "text" })];
  it("emits only edited keys", () => {
    expect(changedValues({ kept: "same", edited: "old" }, { kept: "same", edited: "new" }, attrs)).toEqual({
      edited: ["new"],
    });
  });
  it("empty diff → empty object (caller skips the request)", () => {
    expect(changedValues({ kept: "x" }, { kept: "x" }, attrs)).toEqual({});
  });
});
