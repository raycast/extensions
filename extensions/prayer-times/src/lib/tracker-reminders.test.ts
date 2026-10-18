import { beforeEach, describe, expect, it, vi } from "vitest";

// Apple Reminders on, with the Swift calls replaced by mocks.
const mocks = vi.hoisted(() => ({
  stored: {} as Record<string, string>,
  setPrayerCompleted: vi.fn(),
  syncPrayerReminders: vi.fn(),
  movePrayerReminders: vi.fn(),
  getPrayerStatuses: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
  LocalStorage: {
    getItem: async (key: string) => mocks.stored[key],
    setItem: async (key: string, value: string) => {
      mocks.stored[key] = value;
    },
    removeItem: async (key: string) => {
      delete mocks.stored[key];
    },
  },
  environment: {},
}));
vi.mock("./helper", () => ({
  setPrayerCompleted: mocks.setPrayerCompleted,
  syncPrayerReminders: mocks.syncPrayerReminders,
  movePrayerReminders: mocks.movePrayerReminders,
  getPrayerStatuses: mocks.getPrayerStatuses,
}));

import { loadHistory, setPrayed, setStatus, syncReminders } from "./tracker";
import { readPlanState, writePlanState } from "./storage";
import { buildSettings } from "./settings";
import { addDays, getDaySchedule } from "./prayers";

const settings = buildSettings({ mode: "city", latitude: 24.8607, longitude: 67.0011, label: "Karachi" });
const slotOn = (date: Date, key: string) => getDaySchedule(date, settings.schedule).find((slot) => slot.key === key)!;

beforeEach(() => {
  mocks.stored = {};
  mocks.setPrayerCompleted.mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mocks.syncPrayerReminders.mockReset().mockResolvedValue({ created: 1, updated: 0, unchanged: 0 });
  mocks.movePrayerReminders.mockReset().mockResolvedValue(70);
});

describe("marking a prayer whose reminder is missing", () => {
  it("creates just that reminder, without alarms, for a past day", async () => {
    const asr = slotOn(addDays(new Date(), -3), "asr");
    await setPrayed(asr, settings, true);

    expect(mocks.syncPrayerReminders).toHaveBeenCalledTimes(1);
    const { reminders } = mocks.syncPrayerReminders.mock.calls[0][0];
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ key: asr.id, alarms: [] });
    expect(mocks.setPrayerCompleted).toHaveBeenCalledTimes(2);
  });

  it("runs the full sync for today", async () => {
    const isha = slotOn(new Date(), "isha");
    await setPrayed(isha, settings, true);

    const { reminders } = mocks.syncPrayerReminders.mock.calls[0][0];
    expect(reminders.length).toBe(settings.plan.days * 5);
  });
});

describe("changing the Reminders List setting", () => {
  const recent = () => new Date().toISOString();

  it("moves the prayer reminders to the new list before syncing", async () => {
    await writePlanState({ hash: "Old|7|x", at: recent(), listName: "Old" });
    await syncReminders(settings);

    expect(mocks.movePrayerReminders).toHaveBeenCalledWith("Old", "Prayer");
    expect(mocks.movePrayerReminders.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.syncPrayerReminders.mock.invocationCallOrder[0],
    );
    expect((await readPlanState())?.listName).toBe("Prayer");
  });

  it("reads the previous list from an older saved state without listName", async () => {
    await writePlanState({ hash: "Other|7|x", at: recent() });
    await syncReminders(settings);
    expect(mocks.movePrayerReminders).toHaveBeenCalledWith("Other", "Prayer");
  });

  it("moves nothing when the list is unchanged", async () => {
    await writePlanState({ hash: "Prayer|7|x", at: recent() });
    await syncReminders(settings, new Date(), true);
    expect(mocks.movePrayerReminders).not.toHaveBeenCalled();
    expect(mocks.syncPrayerReminders).toHaveBeenCalledTimes(1);
  });
});

describe("prayer status in Reminders", () => {
  const day = addDays(new Date(), -2);
  const asr = slotOn(day, "asr");

  it("writes the status line with the prayed time", async () => {
    mocks.setPrayerCompleted.mockReset().mockResolvedValue(true);
    await setStatus(asr, settings, "jamaat");
    expect(mocks.setPrayerCompleted).toHaveBeenCalledWith("Prayer", asr.id, true, asr.jamaat ?? asr.start, "jamaat");

    await setPrayed(asr, settings, true, asr.start);
    expect(mocks.setPrayerCompleted).toHaveBeenLastCalledWith("Prayer", asr.id, true, asr.start, "ontime");
  });

  it("unmarking removes the line", async () => {
    mocks.setPrayerCompleted.mockReset().mockResolvedValue(true);
    await setStatus(asr, settings, undefined);
    expect(mocks.setPrayerCompleted).toHaveBeenCalledWith("Prayer", asr.id, false, undefined, undefined);
  });

  it("reads a valid line and ignores one that disagrees with the reminder", async () => {
    const isha = slotOn(day, "isha");
    const fajr = slotOn(day, "fajr");
    mocks.getPrayerStatuses.mockResolvedValue([
      { key: asr.id, isCompleted: true, completionDate: asr.end.toISOString(), status: "madeup" },
      { key: isha.id, isCompleted: false, status: "jamaat" },
      { key: fajr.id, isCompleted: true, completionDate: fajr.start.toISOString(), status: "Jamaat " },
    ]);
    const history = (await loadHistory(settings, day, day))[asr.date];
    expect(history.asr).toMatchObject({ completed: true, status: "madeup", onTime: false });
    expect(history.isha).toMatchObject({ completed: false, status: "missed" });
    expect(history.fajr).toMatchObject({ status: "jamaat", onTime: true });
  });
});
