import { describe, expect, it } from "vitest";
import { holdHUD, noticeSeconds, notificationsEnabled } from "./hud";

const run = async (seconds: number) => {
  const shown: string[] = [];
  const pauses: number[] = [];
  await holdHUD(
    async (t) => void shown.push(t),
    "hello",
    seconds,
    async (ms) => void pauses.push(ms),
  );
  return { shown, pauses };
};

describe("holdHUD", () => {
  it("shows once for a short duration, with no pause", async () => {
    expect(await run(1)).toEqual({ shown: ["hello"], pauses: [] });
  });
  it("refreshes every second, before the previous one starts to fade", async () => {
    const { shown, pauses } = await run(6);
    expect(shown).toHaveLength(6);
    expect(pauses).toEqual([1000, 1000, 1000, 1000, 1000]);
  });
  it("never repeats for zero or negative time", async () => {
    expect((await run(0)).shown).toHaveLength(1);
    expect((await run(-3)).shown).toHaveLength(1);
  });
});

describe("notificationsEnabled", () => {
  it("is off until the user turns it on: the message closes the Raycast window if it is open", () => {
    expect(notificationsEnabled({})).toBe(false);
    expect(notificationsEnabled({ notifications: undefined })).toBe(false);
  });
  it("follows the checkbox", () => {
    expect(notificationsEnabled({ notifications: true })).toBe(true);
    expect(notificationsEnabled({ notifications: false })).toBe(false);
  });
});

describe("noticeSeconds", () => {
  it("defaults to 6 seconds", () => {
    expect(noticeSeconds({})).toBe(6);
    expect(noticeSeconds({ noticeDuration: "oops" })).toBe(6);
  });
  it("reads the dropdown value", () => {
    expect(noticeSeconds({ noticeDuration: "2" })).toBe(2);
    expect(noticeSeconds({ noticeDuration: "6" })).toBe(6);
  });
});
