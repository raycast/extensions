import { describe, expect, it } from "vitest";
import { addToHistory, DEFAULT_HISTORY_SIZE, parseHistorySize } from "./history";

describe("parseHistorySize", () => {
  it.each([
    [true, "20", 20],
    [true, " 5 ", 5],
    [true, "0", 0],
    [true, "", DEFAULT_HISTORY_SIZE],
    [true, "-1", DEFAULT_HISTORY_SIZE],
    [true, "2.5", DEFAULT_HISTORY_SIZE],
    [true, "many", DEFAULT_HISTORY_SIZE],
    [false, "20", 0],
  ])("parses enabled=%s, %j as %s", (enabled, text, size) => {
    expect(parseHistorySize(enabled, text)).toBe(size);
  });
});

describe("addToHistory", () => {
  it("puts the newest prefix first", () => {
    expect(addToHistory(["b", "c"], "a", 5)).toEqual(["a", "b", "c"]);
  });

  it("moves a repeated prefix to the front", () => {
    expect(addToHistory(["a", "b", "c"], "c", 5)).toEqual(["c", "a", "b"]);
  });

  it("keeps the current prefix and size previous ones", () => {
    expect(addToHistory(["b", "c", "d"], "a", 2)).toEqual(["a", "b", "c"]);
  });
});
