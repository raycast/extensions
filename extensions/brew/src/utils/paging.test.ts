import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  clampPage,
  hasNextPage,
  pageCount,
  pageRangeCompact,
  pageRangeSummary,
  visibleTotal,
} from "./paging";

describe("pageCount", () => {
  it("counts the pages the real cask index spans", () => {
    expect(pageCount(7716)).toBe(78);
    expect(pageCount(8597)).toBe(86);
  });

  it("does not add an empty trailing page on an exact multiple", () => {
    expect(pageCount(200)).toBe(2);
    expect(pageCount(PAGE_SIZE)).toBe(1);
  });

  it("is one page for an unknown, empty or negative total", () => {
    expect(pageCount(undefined)).toBe(1);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(-5)).toBe(1);
  });
});

describe("clampPage", () => {
  it("holds the last page rather than running past the end", () => {
    expect(clampPage(99, 7716)).toBe(77);
  });

  it("never goes below the first page", () => {
    expect(clampPage(-1, 7716)).toBe(0);
  });

  it("collapses to the first page when the total is unknown", () => {
    // Happens while the totals for a previous query are still on screen.
    expect(clampPage(40, undefined)).toBe(0);
  });

  it("leaves an in-range page alone", () => {
    expect(clampPage(12, 7716)).toBe(12);
  });
});

describe("pageRangeSummary", () => {
  it("reads as a range with separators", () => {
    expect(pageRangeSummary(100, 100, 7716, "cask")).toBe("101–200 of 7,716 casks");
    expect(pageRangeSummary(0, 100, 8597, "formula")).toBe("1–100 of 8,597 formulae");
  });

  it("handles a short final page", () => {
    // 7,716 casks: the last page holds 16.
    expect(pageRangeSummary(7700, 16, 7716, "cask")).toBe("7,701–7,716 of 7,716 casks");
  });

  it("does not render a range for a single row", () => {
    expect(pageRangeSummary(0, 1, 1, "cask")).toBe("1 of 1 cask");
    expect(pageRangeSummary(200, 1, 201, "formula")).toBe("201 of 201 formulae");
  });
});

describe("pageRangeCompact", () => {
  it("drops the noun for a narrow column", () => {
    expect(pageRangeCompact(100, 100, 7716)).toBe("101–200 of 7,716");
  });

  it("stays a single number for one row", () => {
    expect(pageRangeCompact(0, 1, 1)).toBe("1 of 1");
  });
});

describe("visibleTotal", () => {
  // Real index sizes on 2026-09-13.
  const totals = { formulae: 8597, casks: 7716 };

  it("spans the longer category when both are shown", () => {
    expect(visibleTotal(totals, { formulae: true, casks: true })).toBe(8597);
  });

  it("ignores a hidden category, even the longer one", () => {
    // This is the bug: with formulae hidden, 8,597 must not govern the page
    // count, or page 86 renders an empty list with no way back.
    expect(visibleTotal(totals, { formulae: false, casks: true })).toBe(7716);
    expect(visibleTotal(totals, { formulae: true, casks: false })).toBe(8597);
  });

  it("is zero when nothing is visible", () => {
    expect(visibleTotal(totals, { formulae: false, casks: false })).toBe(0);
  });

  it("is zero before totals arrive", () => {
    expect(visibleTotal(undefined, { formulae: true, casks: true })).toBe(0);
  });

  it("pairs with pageCount to bound the reachable pages per filter", () => {
    expect(pageCount(visibleTotal(totals, { formulae: false, casks: true }))).toBe(78);
    expect(pageCount(visibleTotal(totals, { formulae: true, casks: true }))).toBe(86);
  });
});

describe("hasNextPage", () => {
  it("is false on the final partial page, where the footer used to promise ⏎ Next Page", () => {
    // 7,716 casks: page 77 is the last one and holds 16 rows, so `total > shown`
    // was still true there while `PagingSection` offered no Next action.
    expect(hasNextPage(77, pageCount(7716))).toBe(false);
  });

  it("is true while pages remain", () => {
    expect(hasNextPage(0, pageCount(7716))).toBe(true);
    expect(hasNextPage(76, pageCount(7716))).toBe(true);
  });

  it("is false when everything fits on one page", () => {
    expect(hasNextPage(0, pageCount(12))).toBe(false);
    expect(hasNextPage(0, pageCount(PAGE_SIZE))).toBe(false);
  });
});
