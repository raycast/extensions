import { afterEach, describe, expect, it } from "vitest";
import {
  filterPendingCloseTabs,
  idsStillPresent,
  releaseConfirmedPendingCloseIds,
  sharedPendingCloseIds,
} from "../../src/utils/pending-close";
import type { Tab } from "../../src/types";

const tabs: Tab[] = [
  { id: "1", url: "https://a.test", title: "A" },
  { id: "2", url: "https://b.test", title: "B" },
];

describe("pending close helpers", () => {
  afterEach(() => {
    sharedPendingCloseIds.clear();
  });

  it("filters tombstoned tabs", () => {
    expect(filterPendingCloseTabs(tabs, new Set(["2"]))).toEqual([tabs[0]]);
  });

  it("shares tombstones across tab list commands", () => {
    sharedPendingCloseIds.add("1");
    expect(filterPendingCloseTabs(tabs, sharedPendingCloseIds)).toEqual([tabs[1]]);
  });

  it("releases only ids absent from fresh tabs", () => {
    const pending = new Set(["1", "3"]);
    expect(releaseConfirmedPendingCloseIds(pending, tabs)).toEqual(["3"]);
    expect([...pending]).toEqual(["1"]);
  });

  it("detects stale ids still present after revalidation", () => {
    expect(idsStillPresent(["1", "3"], tabs)).toEqual(["1"]);
  });
});
