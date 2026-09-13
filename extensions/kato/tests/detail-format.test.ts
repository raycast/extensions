import { describe, expect, it } from "vitest";
import {
  formatDetailDate,
  formatDetailValue,
  formatRecordDetailFields,
  recordDetailMarkdown,
} from "../src/detail-format";

describe("Raycast detail formatting", () => {
  it("formats ISO timestamps as readable local dates", () => {
    expect(
      formatDetailDate("2026-08-08T20:00:00.000Z", "America/Chicago"),
    ).toBe("August 8, 2026 3:00PM");
  });

  it("formats enum-like values without changing regular text", () => {
    expect(formatDetailValue("very_strong")).toBe("Very Strong");
    expect(formatDetailValue("devwithbobby")).toBe("devwithbobby");
  });

  it("removes internal identifiers and formats record fields", () => {
    expect(
      formatRecordDetailFields(
        [
          { label: "Record ID", value: "7dce511d-8dfe-4d50-a9b9" },
          { label: "Connection strength", value: "very_strong" },
          {
            label: "Last email interaction",
            value: "2026-08-08T20:00:00.000Z",
          },
        ],
        "America/Chicago",
      ),
    ).toEqual([
      { label: "Connection strength", value: "Very Strong" },
      { label: "Last email interaction", value: "August 8, 2026 3:00PM" },
    ]);
  });

  it("escapes titles rendered as markdown", () => {
    expect(recordDetailMarkdown("Bobby *Alv*")).toBe("# Bobby \\*Alv\\*");
  });
});
