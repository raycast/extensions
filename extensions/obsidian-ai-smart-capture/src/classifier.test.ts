import { describe, expect, it } from "vitest";

import { sanitizeNoteTitle } from "./classifier";

describe("sanitizeNoteTitle", () => {
  it("removes unsafe filename characters and markdown extensions", () => {
    expect(sanitizeNoteTitle('TAP: Fix "mentions"?.md')).toBe("TAP Fix mentions");
  });

  it("always returns a title", () => {
    expect(sanitizeNoteTitle("...")).toMatch(/^Note /);
  });
});
