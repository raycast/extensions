import { describe, expect, it, vi } from "vitest";
import { describeAlert } from "./alerts";
import { alertsForSlot } from "./state";
import { PrayerSlot } from "./prayers";

vi.mock("@raycast/api", () => ({ launchCommand: vi.fn(), LaunchType: {} }));

const at = (h: number, m: number) => new Date(2026, 9, 8, h, m);
const asr: PrayerSlot = {
  id: "2026-10-08/asr",
  key: "asr",
  name: "Asr",
  date: "2026-10-08",
  start: at(16, 33),
  end: at(18, 12),
  jamaat: at(16, 45),
};
const windows = { startWindowMinutes: 5, endingReminderMinutes: 30, jamaatReminderMinutes: 10, headsUpMinutes: 15 };

describe("heads-up alert", () => {
  it("counts down to jamaat when reminders are due at jamaat, even before the prayer starts", () => {
    const headsUp = alertsForSlot(asr, { ...windows, dueAt: "jamaat" }).find((alert) => alert.kind === "headsUp")!;
    expect(headsUp.at).toEqual(at(16, 30));
    expect(describeAlert(asr, "headsUp", headsUp.at, "jamaat").title).toBe("Asr jamaat in 15m");
  });

  it("counts down to the start when reminders are due at the start", () => {
    const headsUp = alertsForSlot(asr, { ...windows, dueAt: "start" }).find((alert) => alert.kind === "headsUp")!;
    expect(headsUp.at).toEqual(at(16, 18));
    expect(describeAlert(asr, "headsUp", headsUp.at, "start").title).toBe("Asr in 15m");
  });

  it("falls back to the start for a prayer without jamaat", () => {
    const noJamaat = { ...asr, jamaat: undefined };
    expect(describeAlert(noJamaat, "headsUp", at(16, 18), "jamaat").title).toBe("Asr in 15m");
  });
});
