import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";

import { parseUnreadSnapshot, serializeUnreadSnapshot, type UnreadSnapshot } from "../src/domain/unread-snapshot";
import type { UnreadCountResult } from "../src/domain/unread-count";
import { loadUnreadSnapshot, saveUnreadSnapshot } from "../src/unread-snapshot-store";

vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

const getItem = vi.mocked(LocalStorage.getItem);
const setItem = vi.mocked(LocalStorage.setItem);

const result: UnreadCountResult = {
  sources: [
    {
      id: "slack",
      name: "Slack",
      appPath: "/Applications/Slack.app",
      openCommand: "open '/Applications/Slack.app'",
      label: "9+",
      contribution: 9,
      unavailable: false,
    },
    {
      id: "telegram",
      name: "Telegram",
      openCommand: "",
      label: "Not available",
      unavailable: true,
    },
  ],
  aggregate: { kind: "partial", total: 9, hasExcludedUnreadActivity: true },
};
const readAt = new Date("2026-08-27T19:00:00.000Z");
const snapshot: UnreadSnapshot = { result, readAt };

describe("parseUnreadSnapshot", () => {
  it("round-trips a serialized snapshot with every aggregate and per-Source field", () => {
    expect(parseUnreadSnapshot(serializeUnreadSnapshot(snapshot))).toEqual(snapshot);
  });

  it("treats absent, malformed, and wrongly shaped retained data as an absent snapshot", () => {
    expect(parseUnreadSnapshot(undefined)).toBeUndefined();
    expect(parseUnreadSnapshot("")).toBeUndefined();
    expect(parseUnreadSnapshot("not json")).toBeUndefined();
    expect(
      parseUnreadSnapshot(JSON.stringify({ result: { sources: [], aggregate: { kind: "nope" } }, readAt })),
    ).toBeUndefined();
    expect(parseUnreadSnapshot(JSON.stringify({ result, readAt: "not a date" }))).toBeUndefined();
    expect(parseUnreadSnapshot(JSON.stringify({ result }))).toBeUndefined();
  });

  it("accepts an empty Sources array so a failed aggregate round-trips", () => {
    const failed: UnreadSnapshot = { result: { sources: [], aggregate: { kind: "failed" } }, readAt };

    expect(parseUnreadSnapshot(serializeUnreadSnapshot(failed))).toEqual(failed);
  });
});

describe("unread snapshot store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists a snapshot and the view's next poll reads it back", async () => {
    await saveUnreadSnapshot(snapshot);
    expect(setItem).toHaveBeenCalledWith("unread-snapshot", serializeUnreadSnapshot(snapshot));

    getItem.mockResolvedValue(setItem.mock.calls[0][1]);
    await expect(loadUnreadSnapshot()).resolves.toEqual(snapshot);
  });

  it("reads an absent or invalid stored snapshot as undefined", async () => {
    getItem.mockResolvedValue(undefined);
    await expect(loadUnreadSnapshot()).resolves.toBeUndefined();

    getItem.mockResolvedValue("garbage");
    await expect(loadUnreadSnapshot()).resolves.toBeUndefined();
  });
});
