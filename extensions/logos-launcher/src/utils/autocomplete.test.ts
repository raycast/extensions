import { describe, expect, it } from "vitest";
import { buildAutocompleteSearchTerms, escapeSql, normalizeAutocompleteRow } from "./autocomplete";

describe("buildAutocompleteSearchTerms", () => {
  it("keeps the full query first, then unique searchable pieces", () => {
    expect(buildAutocompleteSearchTerms("New Jerusalem new")).toEqual(["New Jerusalem new", "New", "Jerusalem"]);
  });

  it("ignores empty and one-character pieces", () => {
    expect(buildAutocompleteSearchTerms(" a  grace ")).toEqual(["a  grace", "grace"]);
  });
});

describe("escapeSql", () => {
  it("escapes single quotes for SQL string literals", () => {
    expect(escapeSql("John's book")).toBe("John''s book");
  });
});

describe("normalizeAutocompleteRow", () => {
  it("normalizes string fields and filters rows without references", () => {
    expect(
      normalizeAutocompleteRow({
        reference: "ref:bible",
        label: 123,
        description: "Description",
        iconKind: "Book",
      }),
    ).toEqual({
      reference: "ref:bible",
      label: "123",
      description: "Description",
      iconKind: "Book",
    });

    expect(normalizeAutocompleteRow({ label: "Missing reference" })).toBeUndefined();
  });
});
