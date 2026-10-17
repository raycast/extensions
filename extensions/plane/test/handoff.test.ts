import { describe, expect, it } from "vitest";
import { firstLoadMaxAge, getHandoffMaxAgeMs, HANDOFF_MAX_AGE_MS } from "../src/helpers/my-work-items";

describe("My Open Work Items → My Work Items hand-off", () => {
  it("reuses the handed-off result on the first load only, so Refresh fetches fresh", () => {
    const next = firstLoadMaxAge(HANDOFF_MAX_AGE_MS);
    expect(next()).toBe(HANDOFF_MAX_AGE_MS);
    expect(next()).toBeUndefined();
    expect(next()).toBeUndefined();
  });

  it("keeps a standing maxAgeMs after the first load", () => {
    const next = firstLoadMaxAge(HANDOFF_MAX_AGE_MS, 5_000);
    expect(next()).toBe(HANDOFF_MAX_AGE_MS);
    expect(next()).toBe(5_000);
  });

  it("fetches fresh on every load without a hand-off", () => {
    const next = firstLoadMaxAge(undefined);
    expect(next()).toBeUndefined();
    expect(next()).toBeUndefined();
  });

  it("reads the window from the launch context", () => {
    expect(getHandoffMaxAgeMs({ reuseResultMs: HANDOFF_MAX_AGE_MS })).toBe(HANDOFF_MAX_AGE_MS);
    expect(getHandoffMaxAgeMs({ reuseResultMs: 10 * HANDOFF_MAX_AGE_MS })).toBe(HANDOFF_MAX_AGE_MS);
    expect(getHandoffMaxAgeMs(undefined)).toBeUndefined();
    expect(getHandoffMaxAgeMs({ reuseResultMs: "60000" })).toBeUndefined();
    expect(getHandoffMaxAgeMs({ reuseResultMs: -1 })).toBeUndefined();
  });
});
