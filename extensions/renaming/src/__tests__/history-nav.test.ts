import { describe, it, expect, vi, beforeEach } from "vitest";
import { launchCommand, popToRoot } from "@raycast/api";

const { mockSaveToHistory } = vi.hoisted(() => ({
  mockSaveToHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/history", () => ({
  saveToHistory: mockSaveToHistory,
}));

import { recordRenameHistory, openRenameHistory } from "../lib/history-nav";

const mockLaunchCommand = launchCommand as ReturnType<typeof vi.fn>;
const mockPopToRoot = popToRoot as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  mockSaveToHistory.mockResolvedValue(undefined);
  mockLaunchCommand.mockResolvedValue(undefined);
  mockPopToRoot.mockResolvedValue(undefined);
});

describe("recordRenameHistory", () => {
  it("saves and reports true", async () => {
    const ops = [{ oldPath: "/a.txt", newPath: "/b.txt" }];
    expect(await recordRenameHistory("Renamed 1 file", ops)).toBe(true);
    expect(mockSaveToHistory).toHaveBeenCalledWith("Renamed 1 file", ops);
  });

  it("saves nothing for an empty batch", async () => {
    expect(await recordRenameHistory("Renamed 0 files", [])).toBe(false);
    expect(mockSaveToHistory).not.toHaveBeenCalled();
  });

  it("swallows a storage failure and reports false", async () => {
    mockSaveToHistory.mockRejectedValue(new Error("storage full"));
    expect(await recordRenameHistory("Renamed 1 file", [{ oldPath: "/a.txt", newPath: "/b.txt" }])).toBe(false);
  });
});

describe("openRenameHistory", () => {
  it("launches the history command when history was saved", async () => {
    await openRenameHistory(true);
    expect(mockLaunchCommand).toHaveBeenCalledWith({ name: "history", type: "userInitiated" });
    expect(mockPopToRoot).not.toHaveBeenCalled();
  });

  it("pops to root instead when history was not saved", async () => {
    await openRenameHistory(false);
    expect(mockLaunchCommand).not.toHaveBeenCalled();
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("falls back to root when the launch fails", async () => {
    mockLaunchCommand.mockRejectedValue(new Error("command not found"));
    await openRenameHistory(true);
    expect(mockPopToRoot).toHaveBeenCalled();
  });
});
