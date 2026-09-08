import { describe, it, expect } from "vitest";
import { groupMessagesByDate, extractUrlFromText } from "./message";

describe("groupMessagesByDate", () => {
  it("labels today and yesterday, and dates everything older", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const older = new Date("2020-01-02T12:00:00Z");

    const groups = groupMessagesByDate([{ date: today }, { date: yesterday }, { date: older }]);
    const keys = Array.from(groups.keys());

    expect(keys[0]).toBe("Today");
    expect(keys[1]).toBe("Yesterday");
    expect(keys[2]).not.toBe("Today");
    expect(groups.get("Today")).toHaveLength(1);
  });

  it("keeps several messages from the same day together", () => {
    const a = new Date();
    const b = new Date(a.getTime() - 1000);

    expect(groupMessagesByDate([{ date: a }, { date: b }]).get("Today")).toHaveLength(2);
  });
});

describe("extractUrlFromText", () => {
  it("returns a bare url", () => {
    expect(extractUrlFromText("https://example.com/a")).toBe("https://example.com/a");
  });

  it("returns a url followed by only a short trailer", () => {
    expect(extractUrlFromText("https://example.com wow")).toBe("https://example.com");
  });

  it("ignores a url buried in a sentence", () => {
    expect(extractUrlFromText("https://example.com and then a great deal more prose")).toBeNull();
  });

  it("returns null for empty or non-url text", () => {
    expect(extractUrlFromText("")).toBeNull();
    expect(extractUrlFromText("   ")).toBeNull();
    expect(extractUrlFromText("just a message")).toBeNull();
  });
});
