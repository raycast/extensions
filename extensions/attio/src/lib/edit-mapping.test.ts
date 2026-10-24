import { describe, expect, it } from "vitest";
import type { Attribute, AttributeValue } from "../api/types";
import {
  changedValues,
  creatableAttributes,
  deferredEditableAttributes,
  editableAttributes,
  initialFieldValue,
  personalNameToWire,
  staticCheckboxDefault,
  toWireValue,
} from "./edit-mapping";

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

describe("creatableAttributes — create form covers names, owners, and record links", () => {
  it("includes personal-name, actor-reference, and single record-reference on top of the editable set", () => {
    const list = [
      attr({ api_slug: "name", type: "personal-name" }),
      attr({ api_slug: "owner", type: "actor-reference" }),
      attr({ api_slug: "company", type: "record-reference" }),
      attr({ api_slug: "team", type: "record-reference", is_multiselect: true }), // no async multiselect UI
      attr({ api_slug: "ok_text", type: "text" }),
      attr({ api_slug: "not_writable", type: "personal-name", is_writable: false }),
      attr({ api_slug: "deferred_loc", type: "location" }),
    ];
    expect(creatableAttributes(list).map((a) => a.api_slug)).toEqual(["name", "owner", "company", "ok_text"]);
  });
});

describe("staticCheckboxDefault — seeds the create form so display matches outcome", () => {
  it("returns the workspace's static default for a checkbox", () => {
    const a = attr({
      api_slug: "c",
      type: "checkbox",
      is_default_value_enabled: true,
      default_value: { type: "static", template: [{ attribute_type: "checkbox", value: true }] },
    });
    expect(staticCheckboxDefault(a)).toBe(true);
  });
  it("returns undefined for dynamic, disabled, or non-checkbox defaults", () => {
    expect(staticCheckboxDefault(attr({ api_slug: "c", type: "checkbox" }))).toBeUndefined();
    expect(
      staticCheckboxDefault(
        attr({
          api_slug: "c",
          type: "checkbox",
          is_default_value_enabled: true,
          default_value: { type: "dynamic", template: "current-user" },
        }),
      ),
    ).toBeUndefined();
  });
});

describe("deferredEditableAttributes — the edit form's name/owner/record-link fields", () => {
  it("keeps writable personal-name, actor-reference, and single record-reference", () => {
    const list = [
      attr({ api_slug: "name", type: "personal-name" }),
      attr({ api_slug: "owner", type: "actor-reference" }),
      attr({ api_slug: "company", type: "record-reference" }),
      attr({ api_slug: "team", type: "record-reference", is_multiselect: true }), // no async multiselect UI
      attr({ api_slug: "loc", type: "location" }), // stays Attio-only
      attr({ api_slug: "ro_name", type: "personal-name", is_writable: false }),
      attr({ api_slug: "plain_text", type: "text" }), // main edit form owns it
    ];
    expect(deferredEditableAttributes(list).map((a) => a.api_slug)).toEqual(["name", "owner", "company"]);
  });
});

describe("personalNameToWire — Attio object syntax needs all three fields", () => {
  it("splits First … Last into the object form", () => {
    expect(personalNameToWire("Ada Lovelace")).toEqual([
      { first_name: "Ada", last_name: "Lovelace", full_name: "Ada Lovelace" },
    ]);
    expect(personalNameToWire("Anne Marie Smith")).toEqual([
      { first_name: "Anne Marie", last_name: "Smith", full_name: "Anne Marie Smith" },
    ]);
  });
  it("normalizes non-breaking spaces so pasted names still split", () => {
    expect(personalNameToWire("Ada Lovelace")).toEqual([
      { first_name: "Ada", last_name: "Lovelace", full_name: "Ada Lovelace" },
    ]);
  });
  it("single token uses Attio's string syntax (no comma = first name)", () => {
    expect(personalNameToWire("Ada")).toEqual(["Ada"]);
  });
  it("'Last, First' input passes through as the string syntax Attio parses", () => {
    expect(personalNameToWire("Smith, John")).toEqual(["Smith, John"]);
  });
  it("empty clears", () => {
    expect(personalNameToWire("  ")).toEqual([]);
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
  it("multiselect free-text types accept arrays (tag-input UI); single-value types reject them", () => {
    const domains = attr({ api_slug: "d", type: "domain", is_multiselect: true });
    expect(toWireValue(domains, ["attio.com", "example.org"])).toEqual(["attio.com", "example.org"]);
    expect(toWireValue(attr({ api_slug: "e", type: "email-address", is_multiselect: true }), ["a@b.co"])).toEqual([
      "a@b.co",
    ]);
    expect(() => toWireValue(attr({ api_slug: "t", type: "text" }), ["a", "b"])).toThrow(/single/i);
  });
  it("domains must have a well-formed TLD", () => {
    const a = attr({ api_slug: "d", type: "domain", is_multiselect: true });
    expect(toWireValue(a, ["sub.attio.com"])).toEqual(["sub.attio.com"]);
    expect(() => toWireValue(a, ["not a domain"])).toThrow(/domain/i);
    expect(() => toWireValue(a, ["attio"])).toThrow(/domain/i); // no TLD
    expect(() => toWireValue(a, ["https://attio.com"])).toThrow(/domain/i); // no protocol
    expect(() => toWireValue(a, "attio, example.org")).toThrow(/domain/i); // string path validates too
    expect(toWireValue(a, ["example.xn--p1ai"])).toEqual(["example.xn--p1ai"]); // punycode TLD is legal
    expect(() => toWireValue(a, ["bad-.com"])).toThrow(/domain/i); // labels can't end in a hyphen
    expect(() => toWireValue(a, ["-bad.com"])).toThrow(/domain/i); // or start with one
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
