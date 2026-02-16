import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@raycast/api", () => ({
  showToast: vi.fn(),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
      Animated: "animated",
    },
  },
}));

import { showToast } from "@raycast/api";

vi.mock("../lib/files", () => ({
  batchRename: vi.fn(),
  fileExists: vi.fn(),
}));

import { showResultToast, withProgress, type BatchOperationResult } from "../lib/progress";
import { batchRename } from "../lib/files";
import type { RenameResult } from "../types";

const mockShowToast = showToast as ReturnType<typeof vi.fn>;
const mockBatchRename = batchRename as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("showResultToast", () => {
  it("shows success toast when all operations succeed", async () => {
    const result: BatchOperationResult = {
      results: [
        { oldPath: "/a.txt", newPath: "/b.txt", success: true },
        { oldPath: "/c.txt", newPath: "/d.txt", success: true },
      ],
      successCount: 2,
      failCount: 0,
      successfulOps: [
        { oldPath: "/a.txt", newPath: "/b.txt" },
        { oldPath: "/c.txt", newPath: "/d.txt" },
      ],
    };

    await showResultToast(result, "Renamed");

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Renamed 2 files",
      }),
    );
  });

  it("shows failure toast when some operations fail", async () => {
    const result: BatchOperationResult = {
      results: [
        { oldPath: "/a.txt", newPath: "/b.txt", success: true },
        { oldPath: "/c.txt", newPath: "/d.txt", success: false, error: "Permission denied" },
      ],
      successCount: 1,
      failCount: 1,
      successfulOps: [{ oldPath: "/a.txt", newPath: "/b.txt" }],
    };

    await showResultToast(result, "Renamed");

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        message: "Permission denied",
      }),
    );
  });

  it("uses singular 'file' for single success", async () => {
    const result: BatchOperationResult = {
      results: [{ oldPath: "/a.txt", newPath: "/b.txt", success: true }],
      successCount: 1,
      failCount: 0,
      successfulOps: [{ oldPath: "/a.txt", newPath: "/b.txt" }],
    };

    await showResultToast(result, "Renamed");

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Renamed 1 file",
      }),
    );
  });
});

describe("withProgress", () => {
  it("calls batchRename with the provided operations", async () => {
    const operations = [{ oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" }];
    const mockResults: RenameResult[] = [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true }];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Renaming",
    });

    expect(mockBatchRename).toHaveBeenCalledOnce();
    expect(mockBatchRename).toHaveBeenCalledWith(operations, expect.any(Function));
  });

  it("returns correct success and fail counts", async () => {
    const operations = [
      { oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" },
      { oldPath: "/dir/c.txt", newName: "d.txt", newPath: "/dir/d.txt" },
      { oldPath: "/dir/e.txt", newName: "f.txt", newPath: "/dir/f.txt" },
    ];
    const mockResults: RenameResult[] = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true },
      { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", success: false, error: "Permission denied" },
      { oldPath: "/dir/e.txt", newPath: "/dir/f.txt", success: true },
    ];
    mockBatchRename.mockResolvedValue(mockResults);

    const result = await withProgress(operations, {
      actionName: "Renaming",
    });

    expect(result.successCount).toBe(2);
    expect(result.failCount).toBe(1);
    expect(result.results).toEqual(mockResults);
    expect(result.successfulOps).toEqual([
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt" },
      { oldPath: "/dir/e.txt", newPath: "/dir/f.txt" },
    ]);
  });

  it("creates past tense from actionName ending in 'ing'", async () => {
    const operations = [{ oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" }];
    const mockResults: RenameResult[] = [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true }];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Renaming",
    });

    // "Renaming" -> "Renam" + "ed" = "Renamed"
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Renamed 1 file",
      }),
    );
  });

  it("keeps actionName as-is when it does not end in 'ing'", async () => {
    const operations = [{ oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" }];
    const mockResults: RenameResult[] = [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true }];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Convert",
    });

    // "Convert" does not end in "ing", so it stays as "Convert"
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Convert 1 file",
      }),
    );
  });

  it("shows success toast when all operations succeed", async () => {
    const operations = [
      { oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" },
      { oldPath: "/dir/c.txt", newName: "d.txt", newPath: "/dir/d.txt" },
    ];
    const mockResults: RenameResult[] = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true },
      { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", success: true },
    ];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Replacing",
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Replaced 2 files",
        message: "Press ⌘Z to undo",
      }),
    );
  });

  it("shows failure toast when some operations fail", async () => {
    const operations = [
      { oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" },
      { oldPath: "/dir/c.txt", newName: "d.txt", newPath: "/dir/d.txt" },
    ];
    const mockResults: RenameResult[] = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: true },
      { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", success: false, error: "File locked" },
    ];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Renaming",
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Renamed 1/2 — 1 failed",
        message: "File locked",
      }),
    );
  });

  it("shows failure toast when all operations fail", async () => {
    const operations = [{ oldPath: "/dir/a.txt", newName: "b.txt", newPath: "/dir/b.txt" }];
    const mockResults: RenameResult[] = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", success: false, error: "Disk full" },
    ];
    mockBatchRename.mockResolvedValue(mockResults);

    await withProgress(operations, {
      actionName: "Renaming",
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Renamed 0/1 — 1 failed",
        message: "Disk full",
      }),
    );
  });
});
