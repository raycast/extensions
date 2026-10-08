import { describe, expect, it } from "vitest";
import { pluralize, relativeTime, sectionTitle, updatedLabel } from "./format";

describe("format", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it("renders relative times", () => {
    expect(relativeTime(ago(5), now)).toBe("just now");
    expect(relativeTime(ago(-30), now)).toBe("just now");
    expect(relativeTime(ago(180), now)).toBe("3m ago");
    expect(relativeTime(ago(2 * 3600 + 10), now)).toBe("2h ago");
    expect(relativeTime(ago(3 * 86400), now)).toBe("3d ago");
  });

  it("renders the updated label", () => {
    expect(updatedLabel(ago(180), now)).toBe("Updated 3m ago");
    expect(updatedLabel(undefined, now)).toBeUndefined();
  });

  it("pluralizes and titles sections", () => {
    expect(pluralize(1, "sale")).toBe("1 sale");
    expect(pluralize(2, "sale")).toBe("2 sales");
    expect(sectionTitle("Refunds", 3)).toBe("Refunds (3)");
  });
});
