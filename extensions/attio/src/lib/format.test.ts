import { describe, expect, it } from "vitest";
import type { AttributeValue } from "../api/types";
import { formatValue, formatValues, getRecordReferences, referencesByObject, shortId } from "./format";

const meta = {
  active_from: "2026-01-01T00:00:00.000000000Z",
  active_until: null,
  created_by_actor: { id: null, type: "system" },
};
// Cast helper: synthetic partials for variants whose generated shapes carry
// long optional tails. Each object still includes every field format reads.
const v = (x: Record<string, unknown>) => ({ ...meta, ...x }) as unknown as AttributeValue;

describe("formatValue — every discriminant renders, none as '?' or [object Object]", () => {
  const cases: Array<[AttributeValue, string]> = [
    [v({ attribute_type: "text", value: "hello" }), "hello"],
    [v({ attribute_type: "number", value: 42 }), "42"],
    [v({ attribute_type: "checkbox", value: true }), "Yes"],
    [v({ attribute_type: "checkbox", value: false }), "No"],
    [v({ attribute_type: "date", value: "2026-01-02" }), "2026-01-02"],
    [v({ attribute_type: "timestamp", value: "2026-01-02T03:04:05Z" }), "2026-01-02T03:04:05Z"],
    [v({ attribute_type: "rating", value: 4 }), "4"],
    [v({ attribute_type: "currency", currency_value: 300000, currency_code: "USD" }), "$300,000.00"],
    [v({ attribute_type: "currency", currency_value: 5, currency_code: null }), "5"],
    [v({ attribute_type: "domain", domain: "app.attio.com", root_domain: "attio.com" }), "app.attio.com"],
    [v({ attribute_type: "email-address", email_address: "a@example.com" }), "a@example.com"],
    [v({ attribute_type: "phone-number", phone_number: "+15551234567" }), "+15551234567"],
    [
      v({ attribute_type: "personal-name", full_name: "Ada Example", first_name: "Ada", last_name: "Example" }),
      "Ada Example",
    ],
    [
      v({ attribute_type: "location", line_1: null, locality: "Oakland", region: "CA", country_code: "US" }),
      "Oakland, CA, US",
    ],
    [
      v({
        attribute_type: "interaction",
        interaction_type: "email",
        interacted_at: "2026-01-02T00:00:00Z",
        owner_actor: { id: "x", type: "workspace-member" },
      }),
      "2026-01-02T00:00:00Z",
    ],
    [
      v({
        attribute_type: "record-reference",
        target_object: "companies",
        target_record_id: "abcdef12-3456-7890-abcd-ef1234567890",
      }),
      "companies · abcdef12",
    ],
    [v({ attribute_type: "status", status: { title: "Negotiation", is_archived: false } }), "Negotiation"],
    [v({ attribute_type: "status", status: "abcdef12-9999-8888-7777-666666666666" }), "abcdef12"],
    [v({ attribute_type: "select", option: { title: "Inbound", is_archived: false } }), "Inbound"],
    [v({ attribute_type: "select", option: "deadbeef-1111-2222-3333-444444444444" }), "deadbeef"],
  ];
  for (const [value, expected] of cases) {
    it(`${value.attribute_type} → "${expected}"`, () => {
      expect(formatValue(value)).toBe(expected);
    });
  }
  it("actor-reference uses ctx.memberName, falls back to shortId, then em dash", () => {
    const actor = v({
      attribute_type: "actor-reference",
      referenced_actor_type: "workspace-member",
      referenced_actor_id: "abcdef12-0000-0000-0000-000000000000",
    });
    expect(formatValue(actor, { memberName: () => "Chris" })).toBe("Chris");
    expect(formatValue(actor)).toBe("abcdef12");
    expect(
      formatValue(v({ attribute_type: "actor-reference", referenced_actor_type: "system", referenced_actor_id: null })),
    ).toBe("—");
  });
});

describe("formatValues", () => {
  it("joins with comma-space (the old code used bare join())", () => {
    expect(formatValues([v({ attribute_type: "text", value: "a" }), v({ attribute_type: "text", value: "b" })])).toBe(
      "a, b",
    );
  });
  it("empty array → em dash", () => {
    expect(formatValues([])).toBe("—");
  });
});

describe("malformed-response hardening (Gate A)", () => {
  it("number with runtime NaN/string renders em dash", () => {
    expect(formatValue(v({ attribute_type: "number", value: NaN }))).toBe("—");
    expect(formatValue(v({ attribute_type: "number", value: "NaN" }))).toBe("—");
  });
  it("currency with non-finite value renders em dash", () => {
    expect(formatValue(v({ attribute_type: "currency", currency_value: NaN, currency_code: "USD" }))).toBe("—");
  });
  it("empty personal-name renders em dash", () => {
    expect(formatValue(v({ attribute_type: "personal-name", full_name: "", first_name: null, last_name: null }))).toBe(
      "—",
    );
  });
  it("null timestamp renders em dash, never the string 'null'", () => {
    expect(formatValue(v({ attribute_type: "timestamp", value: null }))).toBe("—");
  });
});

describe("accessors", () => {
  it("shortId", () => expect(shortId("abcdef12-3456")).toBe("abcdef12"));
  it("getRecordReferences collects across attributes", () => {
    const refs = getRecordReferences({
      x: [v({ attribute_type: "record-reference", target_object: "people", target_record_id: "p1" })],
      y: [v({ attribute_type: "text", value: "noise" })],
    });
    expect(refs).toEqual([{ target_object: "people", target_record_id: "p1" }]);
  });
});

describe("referencesByObject", () => {
  it("buckets by target_object and dedupes by target_record_id, across attributes", () => {
    const refs = referencesByObject({
      team: [
        v({ attribute_type: "record-reference", target_object: "people", target_record_id: "p1" }),
        v({ attribute_type: "record-reference", target_object: "people", target_record_id: "p2" }),
      ],
      manager: [v({ attribute_type: "record-reference", target_object: "people", target_record_id: "p1" })],
      company: [v({ attribute_type: "record-reference", target_object: "companies", target_record_id: "c1" })],
      noise: [v({ attribute_type: "text", value: "x" })],
    });
    expect(refs.people?.map((r) => r.target_record_id)).toEqual(["p1", "p2"]);
    expect(refs.companies?.map((r) => r.target_record_id)).toEqual(["c1"]);
  });
  it("empty values → empty object", () => {
    expect(referencesByObject({})).toEqual({});
  });
});
