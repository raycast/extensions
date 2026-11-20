import { describe, expect, it } from "vitest";
import type { AttioRecord, AttributeValue } from "../api/types";
import { recordSubtitle, recordTitle } from "./display";

const meta = {
  active_from: "2026-01-01T00:00:00Z",
  active_until: null,
  created_by_actor: { id: null, type: "system" },
};
const v = (x: Record<string, unknown>) => ({ ...meta, ...x }) as unknown as AttributeValue;
const rec = (values: AttioRecord["values"]): AttioRecord => ({
  id: { workspace_id: "w", object_id: "o", record_id: "abcdef12-0000" },
  created_at: "2026-01-01T00:00:00Z",
  web_url: "https://app.attio.com/x",
  values,
});

describe("recordTitle", () => {
  it("uses the known standard-object attribute first", () => {
    expect(recordTitle(rec({ name: [v({ attribute_type: "text", value: "Verkada" })] }), "deals")).toBe("Verkada");
  });
  it("falls back to personal-name for unknown objects", () => {
    expect(
      recordTitle(
        rec({
          contact: [
            v({ attribute_type: "personal-name", full_name: "Ada Example", first_name: "Ada", last_name: "Example" }),
          ],
        }),
        "custom_thing",
      ),
    ).toBe("Ada Example");
  });
  it("falls back to shortId when nothing matches — never the row index", () => {
    expect(recordTitle(rec({}), "custom_thing")).toBe("abcdef12");
  });
});

describe("recordSubtitle", () => {
  it("renders the known subtitle attribute", () => {
    expect(
      recordSubtitle(
        rec({ domains: [v({ attribute_type: "domain", domain: "verkada.com", root_domain: "verkada.com" })] }),
        "companies",
      ),
    ).toBe("verkada.com");
  });
  it("undefined when absent", () => {
    expect(recordSubtitle(rec({}), "companies")).toBeUndefined();
  });
});
