import { describe, expect, it } from "vitest";

import { buildObjectKey } from "../paths";

describe("buildObjectKey", () => {
  it("builds a date-scoped key", () => {
    const key = buildObjectKey(undefined, new Date(2026, 1, 18, 12, 0, 0));
    expect(key).toMatch(/^2026\/02\/18\/[0-9a-f-]+\.webp$/);
  });

  it("normalizes key prefix", () => {
    const key = buildObjectKey("/shots//daily/", new Date(2026, 1, 18, 12, 0, 0));
    expect(key).toMatch(/^shots\/daily\/2026\/02\/18\/[0-9a-f-]+\.webp$/);
  });

  it("supports jpg keys for fallback compression", () => {
    const key = buildObjectKey("shots", new Date(2026, 1, 18, 12, 0, 0), "jpg");
    expect(key).toMatch(/^shots\/2026\/02\/18\/[0-9a-f-]+\.jpg$/);
  });
});
