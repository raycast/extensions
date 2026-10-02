import { describe, expect, it } from "vitest";
import { friendlyDate, friendlyDay } from "./friendly-date";

describe("friendlyDate", () => {
  const now = new Date("2026-08-31T12:00:00Z");

  it("under 48h → relative", () => {
    const iso = new Date("2026-08-31T10:00:00Z").toISOString();
    expect(friendlyDate(iso, now)).toBe("about 2 hours ago");
  });

  it("under 1 year → MMM d", () => {
    const iso = new Date("2026-08-21T12:00:00Z").toISOString();
    expect(friendlyDate(iso, now)).toBe("Aug 21");
  });

  it("over 1 year → includes year", () => {
    const iso = new Date("2024-08-21T12:00:00Z").toISOString();
    expect(friendlyDate(iso, now)).toBe("Aug 21, 2024");
  });

  it("invalid date → returned verbatim", () => {
    expect(friendlyDate("not-a-date", now)).toBe("not-a-date");
  });
});

describe("friendlyDay", () => {
  it("formats a plain YYYY-MM-DD", () => {
    expect(friendlyDay("2026-08-21")).toBe("Aug 21, 2026");
  });

  it("invalid date → returned verbatim", () => {
    expect(friendlyDay("garbage")).toBe("garbage");
  });
});
