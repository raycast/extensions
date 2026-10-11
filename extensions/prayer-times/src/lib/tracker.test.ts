import { describe, expect, it, vi } from "vitest";
import { completionTimeFor } from "./tracker";
import { PrayerSlot } from "./prayers";

vi.mock("@raycast/api", () => ({ LocalStorage: {}, environment: {} }));

const at = (h: number, m: number, day = 8) => new Date(2026, 9, day, h, m);
const asr: PrayerSlot = {
  id: "2026-10-08/asr",
  key: "asr",
  name: "Asr",
  date: "2026-10-08",
  start: at(16, 33),
  end: at(18, 12),
  jamaat: at(16, 45),
};

describe("completionTimeFor", () => {
  it("uses now while the prayer time is running", () => {
    expect(completionTimeFor(asr, true, at(17, 0))).toEqual(at(17, 0));
  });

  it("back-dates on time to jamaat, or the start without one", () => {
    expect(completionTimeFor(asr, true, at(21, 0))).toEqual(at(16, 45));
    expect(completionTimeFor({ ...asr, jamaat: undefined }, true, at(21, 0))).toEqual(at(16, 33));
  });

  it("records late as the end of the prayer time, or now if later", () => {
    expect(completionTimeFor(asr, false, at(17, 0))).toEqual(at(18, 12));
    expect(completionTimeFor(asr, false, at(21, 0))).toEqual(at(21, 0));
  });
});
