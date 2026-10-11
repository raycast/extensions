import { beforeEach, describe, expect, it, vi } from "vitest";

// Apple Reminders off: prayed marks live in the extension's local log.
const store = vi.hoisted(() => ({ items: {} as Record<string, string> }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ useReminders: false }),
  LocalStorage: {
    getItem: async (key: string) => store.items[key],
    setItem: async (key: string, value: string) => {
      store.items[key] = value;
    },
  },
  environment: {},
}));

import { loadHistory, setPrayed } from "./tracker";
import { buildSettings } from "./settings";
import { addDays, getDaySchedule, toDateKey } from "./prayers";

const settings = buildSettings({ mode: "city", latitude: 24.8607, longitude: 67.0011, label: "Karachi" });
const today = new Date();
const yesterday = addDays(today, -1);

beforeEach(() => {
  store.items = { trackingSince: JSON.stringify(toDateKey(today)).slice(1, -1) };
});

describe("local history before tracking started", () => {
  it("shows a prayer marked for a day before tracking started, leaving the rest as no data", async () => {
    const asr = getDaySchedule(yesterday, settings.schedule).find((slot) => slot.key === "asr")!;
    await setPrayed(asr, settings, true, asr.start);

    const history = await loadHistory(settings, yesterday, today);
    expect(history[toDateKey(yesterday)]).toEqual({
      asr: { completed: true, completedAt: asr.start, onTime: true },
    });
  });

  it("still counts every prayer from the day tracking started", async () => {
    const history = await loadHistory(settings, today, today);
    expect(Object.keys(history[toDateKey(today)] ?? {})).toHaveLength(5);
  });
});
