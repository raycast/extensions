import { describe, expect, it } from "vitest";

import { buildSearchFilter } from "../src/helpers/search";

const NOW = new Date("2026-10-14T12:00:00Z");

describe("buildSearchFilter", () => {
  it("quotes each keyword", () => {
    expect(buildSearchFilter("budget  forecast", "all", NOW)).toBe('"budget" AND "forecast"');
    expect(buildSearchFilter('say "hi"', "all", NOW)).toBe('"say" AND "\\"hi\\""');
  });

  it("adds the documented functions for each mode", () => {
    expect(buildSearchFilter("x", "unread", NOW)).toBe('"x" AND is_unread()');
    expect(buildSearchFilter("x", "mentions", NOW)).toBe('"x" AND annotations.user_mentions.user.name:users/me');
    expect(buildSearchFilter("x", "links", NOW)).toBe('"x" AND has_link()');
    expect(buildSearchFilter("x", ["unread", "mentions"], NOW)).toBe(
      '"x" AND is_unread() AND annotations.user_mentions.user.name:users/me',
    );
  });

  it("falls back to recent messages when there are no keywords", () => {
    expect(buildSearchFilter("  ", "all", NOW)).toBe('create_time >= "2026-10-07T12:00:00.000Z"');
    expect(buildSearchFilter("", "unread", NOW)).toBe('is_unread() AND create_time >= "2026-10-07T12:00:00.000Z"');
  });
});
