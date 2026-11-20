import { describe, expect, it } from "vitest";
import { getFormatedDateString, getListSubtitle, getUrlParamsString, joinStringsWithDelimiter } from "../src/utils";

describe("getUrlParamsString", () => {
  it("extracts pagination parameters without the URL path or fragment", () => {
    expect(getUrlParamsString("https://readwise.io/api/v2/books?page=2&page_size=500#results")).toBe(
      "page=2&page_size=500"
    );
  });

  it("sorts query keys and preserves repeated and encoded values", () => {
    expect(getUrlParamsString("https://readwise.io/api/v2/books?tag=deep%20work&category=books&tag=focus%26rest")).toBe(
      "category=books&tag=deep%20work&tag=focus%26rest"
    );
  });

  it("returns an empty string when the URL has no query", () => {
    expect(getUrlParamsString("https://readwise.io/api/v2/books")).toBe("");
  });

  it("rejects an invalid URL", () => {
    expect(() => getUrlParamsString("not a URL")).toThrow(TypeError);
  });
});

describe("getFormatedDateString", () => {
  it("formats a date with a full month and a padded 12-hour time", () => {
    expect(getFormatedDateString("2022-04-03T13:05:00Z")).toBe("April 03, 2022 01:05");
  });

  it("converts a date's offset to the local time zone", () => {
    expect(getFormatedDateString("2022-04-03T23:05:00-04:00")).toBe("April 04, 2022 03:05");
  });

  it("rejects an invalid date", () => {
    expect(() => getFormatedDateString("not a date")).toThrow(RangeError);
  });
});

describe("joinStringsWithDelimiter", () => {
  it("joins non-empty values and skips null, undefined, and empty strings", () => {
    expect(joinStringsWithDelimiter(["Book", null, "", undefined, "Author"], " · ")).toBe("Book · Author");
  });

  it("preserves whitespace and the string zero", () => {
    expect(joinStringsWithDelimiter([" ", "0"], "|")).toBe(" |0");
  });

  it.each([{ values: [] }, { values: [null, undefined, ""] }])("returns an empty string for $values", ({ values }) => {
    expect(joinStringsWithDelimiter(values, ", ")).toBe("");
  });

  it("does not add a delimiter around a single value", () => {
    expect(joinStringsWithDelimiter([null, "Book", ""], ", ")).toBe("Book");
  });
});

describe("getListSubtitle", () => {
  it("shows loading instead of a result count while fetching", () => {
    expect(getListSubtitle(true, 42)).toBe("Loading...");
  });

  it.each([
    [0, "0"],
    [42, "42"],
  ])("shows %i results after loading", (count, subtitle) => {
    expect(getListSubtitle(false, count)).toBe(subtitle);
  });
});
