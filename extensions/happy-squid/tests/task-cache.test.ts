import { beforeEach, expect, test } from "vitest";
import { LocalStorage } from "./raycast-api";
import { readCachedTaskSnapshot } from "../src/task-cache";

const cached = {
  receivedAt: Date.now(),
  snapshot: { deviceId: "desktop-1", capturedAt: Date.now(), recentTasks: [], durationChoices: [5, 15] },
};

beforeEach(() => {
  LocalStorage.getItem.mockReset();
});

test("a snapshot remains usable for a day and a future or expired timestamp is ignored", async () => {
  for (const age of [0, 60_000, 23 * 60 * 60_000]) {
    const value = { ...cached, receivedAt: Date.now() - age };
    LocalStorage.getItem.mockResolvedValue(JSON.stringify(value));
    expect(await readCachedTaskSnapshot("account-1")).toEqual(value);
  }
  for (const age of [-60_000, 25 * 60 * 60_000]) {
    LocalStorage.getItem.mockResolvedValue(JSON.stringify({ ...cached, receivedAt: Date.now() - age }));
    expect(await readCachedTaskSnapshot("account-1")).toBeNull();
  }
});

test("missing or corrupt cache falls through to a live read", async () => {
  for (const value of [undefined, "broken json", "null", "{}", JSON.stringify({ ...cached, snapshot: null })]) {
    LocalStorage.getItem.mockResolvedValue(value);
    expect(await readCachedTaskSnapshot("account-1")).toBeNull();
  }
  LocalStorage.getItem.mockRejectedValue(new Error("Storage unavailable"));
  expect(await readCachedTaskSnapshot("account-1")).toBeNull();
});
