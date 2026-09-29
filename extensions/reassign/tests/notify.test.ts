import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";

// The AppleScript string and the tick contract of src/lib/notify.ts.

const shared = vi.hoisted(() => ({ storage: new Map<string, string>(), runAppleScript: vi.fn() }));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    allItems: async () => Object.fromEntries(shared.storage),
    setItem: async (k: string, v: string) => {
      shared.storage.set(k, v);
    },
    removeItem: async (k: string) => {
      shared.storage.delete(k);
    },
  },
}));
vi.mock("@raycast/utils", () => ({ runAppleScript: shared.runAppleScript }));

import { maybeNotifyTransitions, TICK_MINUTES } from "../src/lib/notify";
import type { ScheduleResponse } from "../src/lib/schedule-model";

const DAY = "2026-09-28";

/** now 10:35, one blocking block at 10:40 → a 'start' ping. */
function scheduleWith(name: string): ScheduleResponse {
  const event = { id: "b", name, start: `${DAY}T10:40`, end: `${DAY}T11:00`, kind: "blocking" as const };
  return { now: `${DAY}T10:35`, timezone: "UTC", days: [{ date: DAY, events: [event] }], areas: [], activityTypes: [] };
}

function script(): string {
  return shared.runAppleScript.mock.calls[0][0] as string;
}

beforeEach(() => {
  shared.storage.clear();
  shared.runAppleScript.mockReset();
});

it("keeps quotes, backslashes and newlines out of the AppleScript string", async () => {
  await maybeNotifyTransitions(scheduleWith('Call "Bob"\\\nre: plan'));
  expect(script()).toContain(`subtitle "Call 'Bob'' re: plan"`);
  expect(script()).not.toMatch(/[\r\n]/);
});

it("names a block with no name 'A block'", async () => {
  await maybeNotifyTransitions(scheduleWith(""));
  expect(script()).toContain('subtitle "A block"');
});

it("does not break when runAppleScript rejects, and still writes the dedup key", async () => {
  shared.runAppleScript.mockRejectedValueOnce(new Error("x"));
  await expect(maybeNotifyTransitions(scheduleWith("Standup"))).resolves.toBeUndefined();
  expect(shared.storage.get(`notified:${DAY}:b:10:40:start`)).toBe("1");
});

it("uses the same tick as the `now` menu-bar interval in package.json", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    commands: { name: string; interval?: string }[];
  };
  const interval = manifest.commands.find((c) => c.name === "now")?.interval;
  expect(interval).toBe(`${TICK_MINUTES}m`);
});
