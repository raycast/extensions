import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage, showToast } from "@raycast/api";

const { mockRenameFn, mockFileExistsFn, mockLstatFn, mockIsSameEntryFn } = vi.hoisted(() => ({
  mockRenameFn: vi.fn().mockResolvedValue(undefined),
  mockFileExistsFn: vi.fn().mockResolvedValue(false),
  mockLstatFn: vi.fn().mockRejectedValue(new Error("ENOENT")),
  mockIsSameEntryFn: vi.fn().mockResolvedValue(false),
}));

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    default: { ...actual, rename: mockRenameFn, lstat: mockLstatFn },
    rename: mockRenameFn,
    lstat: mockLstatFn,
  };
});

vi.mock("../lib/files", () => ({
  fileExists: mockFileExistsFn,
  batchRename: vi.fn(),
}));

vi.mock("../lib/paths", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/paths")>();
  return { ...actual, isSameEntry: mockIsSameEntryFn };
});

import {
  getHistory,
  saveToHistory,
  clearHistory,
  undoToPoint,
  undoEntry,
  undoFileOperation,
  isUndoable,
  previewUndo,
  describeUndoPreview,
  getEffectiveOperations,
} from "../lib/history";
import { MAX_HISTORY_ENTRIES, STORAGE_KEYS } from "../lib/constants";

const mockStorage = LocalStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};
const mockShowToast = showToast as ReturnType<typeof vi.fn>;
const mockRename = mockRenameFn;
const mockFileExists = mockFileExistsFn;
const mockLstat = mockLstatFn;
const mockIsSameEntry = mockIsSameEntryFn;

beforeEach(() => {
  // Reset implementations too (not just call history), so a per-test override
  // like a rejecting setItem cannot leak into later tests; then re-install the
  // defaults every test starts from.
  vi.resetAllMocks();
  mockRename.mockResolvedValue(undefined);
  mockFileExists.mockResolvedValue(false);
  mockLstat.mockResolvedValue({ dev: 7, ino: 1 });
  mockIsSameEntry.mockResolvedValue(false);
  mockStorage.getItem.mockResolvedValue(null);
  // Stateful storage: a write becomes visible to subsequent reads, so
  // updateHistory's post-write verification sees its own payload. Reads
  // queued with mockResolvedValueOnce are still consumed first.
  mockStorage.setItem.mockImplementation(async (_key: string, value: string) => {
    mockStorage.getItem.mockResolvedValue(value);
  });
  mockStorage.removeItem.mockResolvedValue(undefined);
});

describe("getHistory", () => {
  it("returns empty array when no data stored", async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await getHistory();
    expect(result).toEqual([]);
  });

  it("parses stored JSON data", async () => {
    const entries = [
      { timestamp: 1000, description: "Renamed files", operations: [{ oldPath: "/a.txt", newPath: "/b.txt" }] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    const result = await getHistory();
    expect(result).toEqual(entries);
  });

  it("returns empty array on invalid JSON", async () => {
    mockStorage.getItem.mockResolvedValue("not valid json{{{");
    const result = await getHistory();
    expect(result).toEqual([]);
  });
});

describe("saveToHistory", () => {
  it("stores entry at the beginning of the array", async () => {
    const existing = [{ timestamp: 1000, description: "old", operations: [] }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));

    await saveToHistory("new op", [{ oldPath: "/a.txt", newPath: "/b.txt" }]);

    expect(mockStorage.setItem).toHaveBeenCalledOnce();
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].description).toBe("new op");
    expect(stored[0].operations).toEqual([{ oldPath: "/a.txt", newPath: "/b.txt", fileId: "7:1" }]);
    expect(stored[1].description).toBe("old");
  });

  it("trims to MAX_HISTORY_ENTRIES", async () => {
    const entries = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, i) => ({
      timestamp: i,
      description: `op${i}`,
      operations: [],
    }));
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entries));

    await saveToHistory("overflow", []);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored.length).toBe(MAX_HISTORY_ENTRIES);
    expect(stored[0].description).toBe("overflow");
  });
});

describe("clearHistory", () => {
  it("calls LocalStorage.removeItem with correct key", async () => {
    await clearHistory();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.HISTORY);
  });
});

describe("isUndoable", () => {
  it("is true for operations without a status", () => {
    expect(isUndoable({ oldPath: "/a.txt", newPath: "/b.txt" })).toBe(true);
  });

  it("is true for failed operations so they can be retried", () => {
    expect(isUndoable({ oldPath: "/a.txt", newPath: "/b.txt", status: "undo-failed" })).toBe(true);
  });

  it("is false for undone operations", () => {
    expect(isUndoable({ oldPath: "/a.txt", newPath: "/b.txt", status: "undone" })).toBe(false);
  });
});

describe("undoToPoint", () => {
  it("returns false and toasts when history is empty", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const result = await undoToPoint(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Entry No Longer in History" }));
  });

  it("returns false when no entry has the given timestamp", async () => {
    const history = [{ timestamp: 1000, description: "op1", operations: [{ oldPath: "/a.txt", newPath: "/b.txt" }] }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    const result = await undoToPoint(9999);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
  });

  it("undoes multiple entries up to the index and marks their operations undone", async () => {
    const history = [
      {
        timestamp: 3000,
        description: "Third op",
        operations: [{ oldPath: "/dir/e.txt", newPath: "/dir/f.txt", fileId: "7:1" }],
      },
      {
        timestamp: 2000,
        description: "Second op",
        operations: [{ oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" }],
      },
      {
        timestamp: 1000,
        description: "First op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/f.txt" || path === "/dir/d.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(2000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenCalledWith("/dir/f.txt", "/dir/e.txt");
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");

    // All entries stay in history; undone ops are marked, untouched entries unchanged
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(3);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[1].operations[0].status).toBe("undone");
    expect(stored[2].operations[0].status).toBeUndefined();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Reverted 2 operations (2 files)",
      }),
    );
  });

  it("undoes a single entry when given the newest timestamp", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Latest op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
      {
        timestamp: 1000,
        description: "Older op",
        operations: [{ oldPath: "/dir/x.txt", newPath: "/dir/y.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(2000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(2);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[1].operations[0].status).toBeUndefined();

    // the newest entry alone means "1 operation" (singular)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Reverted 1 operation (1 file)",
      }),
    );
  });

  it("marks failed operations undo-failed with the reason and shows a partial toast", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Op with mixed results",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    // b.txt exists (can undo), d.txt does not exist (cannot undo)
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(2000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[0].operations[1].status).toBe("undo-failed");
    expect(stored[0].operations[1].undoError).toContain("d.txt not found");

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "Partial Undo" }));
  });

  it("skips already-undone operations and retries failed ones", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Partially undone op",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", status: "undone" },
          {
            oldPath: "/dir/c.txt",
            newPath: "/dir/d.txt",
            fileId: "7:1",
            status: "undo-failed",
            undoError: "d.txt not found",
          },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    // The failed op's file is back now, so the retry succeeds
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/d.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(2000);

    expect(result).toBe(true);
    // Only the previously-failed op is attempted; the undone one is never touched
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[0].operations[1].status).toBe("undone");
    expect(stored[0].operations[1].undoError).toBeUndefined();
  });

  it("shows Nothing to Undo and does not persist when every operation is already undone", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Fully undone op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", status: "undone" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    const result = await undoToPoint(2000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "Nothing to Undo" }));
  });

  it("returns false but persists the failure marks when all operations fail", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Doomed op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
      {
        timestamp: 1000,
        description: "Survivor",
        operations: [{ oldPath: "/dir/x.txt", newPath: "/dir/y.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(false);

    const result = await undoToPoint(2000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();

    // The failure is recorded so the detail view can show why
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[1].operations[0].status).toBeUndefined();

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "Undo Failed" }));
  });
});

describe("undoFileOperation", () => {
  it("returns false for an unknown timestamp or out-of-range operation index", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    expect(await undoFileOperation(9999, 0)).toBe(false);
    expect(await undoFileOperation(1000, 1)).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("undoes a single file and marks only that operation undone", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Renamed 2 files",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/d.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoFileOperation(2000, 1);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBeUndefined();
    expect(stored[0].operations[1].status).toBe("undone");

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Restored c.txt",
      }),
    );
  });

  it("marks the operation undo-failed with the reason when the file is missing", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(false);

    const result = await undoFileOperation(2000, 0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[0].operations[0].undoError).toContain("b.txt not found");

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "Undo Failed" }));
  });

  it("marks the operation undo-failed when the original name is taken again", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    // Both paths exist: b.txt can be reverted but a.txt is occupied
    mockFileExists.mockResolvedValue(true);

    const result = await undoFileOperation(2000, 0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[0].operations[0].undoError).toContain("a.txt already exists");
  });

  it("refuses to undo an operation that is already undone", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", status: "undone" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    const result = await undoFileOperation(2000, 0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "Already Undone" }));
  });

  it("marks the operation undo-failed when the rename throws", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockRename.mockRejectedValueOnce(new Error("Permission denied"));

    const result = await undoFileOperation(2000, 0);

    expect(result).toBe(false);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[0].operations[0].undoError).toContain("Failed to restore a.txt");
  });
});

describe("previewUndo", () => {
  it("classifies operations as restorable, missing, or occupied", async () => {
    const operations = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }, // restorable
      { oldPath: "/dir/c.txt", newPath: "/dir/gone.txt", fileId: "7:1" }, // missing
      { oldPath: "/dir/taken.txt", newPath: "/dir/d.txt", fileId: "7:1" }, // occupied
    ];
    mockFileExists.mockImplementation(
      async (path: string) => path === "/dir/b.txt" || path === "/dir/d.txt" || path === "/dir/taken.txt",
    );

    const preview = await previewUndo(operations);

    expect(preview).toEqual({ restorable: 1, missing: 1, occupied: 1, replaced: 0, total: 3 });
    expect(mockRename).not.toHaveBeenCalled();
  });

  it("skips operations that are already undone", async () => {
    const operations = [
      { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", status: "undone" as const },
      { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" },
    ];
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/d.txt");

    const preview = await previewUndo(operations);

    expect(preview).toEqual({ restorable: 1, missing: 0, occupied: 0, replaced: 0, total: 1 });
  });
});

describe("describeUndoPreview", () => {
  it("describes a clean undo without mentioning conflicts", () => {
    const message = describeUndoPreview(
      { restorable: 3, missing: 0, occupied: 0, replaced: 0, total: 3 },
      '"Renamed 3 files"',
    );
    expect(message).toBe('This will restore the original names of 3 items from "Renamed 3 files"');
  });

  it("uses the singular for a single item", () => {
    const message = describeUndoPreview(
      { restorable: 1, missing: 0, occupied: 0, replaced: 0, total: 1 },
      '"Renamed 1 file"',
    );
    expect(message).toContain("of 1 item from");
  });

  it("summarizes all three conflict kinds and the skip behavior", () => {
    const message = describeUndoPreview(
      { restorable: 15, missing: 2, occupied: 1, replaced: 1, total: 19 },
      '"Renamed 19 files"',
    );
    expect(message).toContain('15 of 19 items from "Renamed 19 files" can be restored');
    expect(message).toContain("2 were moved or deleted");
    expect(message).toContain("1 has the original name taken");
    expect(message).toContain("1 is not verifiably the renamed item");
    expect(message).toContain("Conflicted items will be skipped and can be retried later");
  });
});

describe("undoEntry", () => {
  it("returns false when no entry has the given timestamp", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const result = await undoEntry(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("undoes only the selected entry, leaving newer entries untouched", async () => {
    const history = [
      {
        timestamp: 3000,
        description: "Third op",
        operations: [{ oldPath: "/dir/e.txt", newPath: "/dir/f.txt", fileId: "7:1" }],
      },
      {
        timestamp: 2000,
        description: "Second op",
        operations: [{ oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" }],
      },
      {
        timestamp: 1000,
        description: "First op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/d.txt");
    mockRename.mockResolvedValue(undefined);

    const result = await undoEntry(2000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(3);
    expect(stored[0].operations[0].status).toBeUndefined();
    expect(stored[1].operations[0].status).toBe("undone");
    expect(stored[2].operations[0].status).toBeUndefined();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Reverted 1 operation (1 file)",
      }),
    );
  });

  it("shows Nothing to Undo when every operation is already undone", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", status: "undone" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    const result = await undoEntry(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Nothing to Undo" }));
  });

  it("still reports the restored files when the history write fails", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockRename.mockResolvedValue(undefined);
    mockStorage.setItem.mockRejectedValue(new Error("storage full"));

    const result = await undoEntry(1000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledWith("/dir/b.txt", "/dir/a.txt");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Undo Finished, History Not Updated" }),
    );
  });
});

describe("filesystem identity", () => {
  it("saveToHistory stamps each operation with the file's dev:ino identity", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockLstat.mockResolvedValue({ dev: 7, ino: 4242 });

    await saveToHistory("op", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }]);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].fileId).toBe("7:4242");
  });

  it("saveToHistory omits fileId when the file cannot be statted", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockLstat.mockRejectedValue(new Error("ENOENT"));

    await saveToHistory("op", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }]);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].fileId).toBeUndefined();
  });

  it("refuses to undo when a different file now sits at the recorded destination", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockLstat.mockResolvedValue({ dev: 7, ino: 2 }); // different inode: replacement file

    const result = await undoEntry(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[0].operations[0].undoError).toContain("replaced by a different file");
  });

  it("refuses to undo an operation recorded without a fileId", async () => {
    const history = [
      { timestamp: 1000, description: "op", operations: [{ oldPath: "/legacy/a.txt", newPath: "/legacy/b.txt" }] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/legacy/b.txt");

    const result = await undoEntry(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undo-failed");
    expect(stored[0].operations[0].undoError).toContain("no recorded identity");
  });

  it("refuses to undo when the destination cannot be statted for verification", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockLstat.mockRejectedValue(new Error("EACCES"));

    const result = await undoEntry(1000);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].undoError).toContain("could not be verified");
  });

  it("previewUndo counts a replaced destination separately", async () => {
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockLstat.mockResolvedValue({ dev: 7, ino: 2 });

    const preview = await previewUndo([{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }]);

    expect(preview).toEqual({ restorable: 0, missing: 0, occupied: 0, replaced: 1, total: 1 });
  });
});

describe("concurrent history writes", () => {
  it("an undo preserves entries recorded by another instance while it ran", async () => {
    const snapshot = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    const concurrent = {
      timestamp: 2000,
      description: "recorded mid-undo",
      operations: [{ oldPath: "/dir/x.txt", newPath: "/dir/y.txt", fileId: "7:1" }],
    };
    // First read: the undo's snapshot. Second read (at persist time): another
    // command instance has prepended a new entry in the meantime.
    mockStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(snapshot))
      .mockResolvedValueOnce(JSON.stringify([concurrent, ...snapshot]));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");

    const result = await undoEntry(1000);

    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(2);
    expect(stored[0].description).toBe("recorded mid-undo");
    expect(stored[0].operations[0].status).toBeUndefined();
    expect(stored[1].operations[0].status).toBe("undone");
  });
});

describe("same-entry concurrent undo merge", () => {
  it("keeps another instance's per-file undo on the same entry", async () => {
    const base = {
      timestamp: 1000,
      description: "Renamed 2 files",
      operations: [
        { oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" },
        { oldPath: "/dir/c.txt", newPath: "/dir/d.txt", fileId: "7:1" },
      ],
    };
    // While we undo file 1, another instance has already undone file 0 and
    // persisted that — visible in the fresh read at persist time.
    const concurrentlyUpdated = {
      ...base,
      operations: [{ ...base.operations[0], status: "undone" }, base.operations[1]],
    };
    mockStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([base]))
      .mockResolvedValueOnce(JSON.stringify([concurrentlyUpdated]));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/d.txt");

    const result = await undoFileOperation(1000, 1);

    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    // Both undos survive: theirs on file 0, ours on file 1
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[0].operations[1].status).toBe("undone");
  });
});

describe("case-only rename undo", () => {
  // On a case-insensitive volume the old spelling resolves to the renamed
  // file itself — that is the file being restored, not an occupying conflict.
  it("restores a case-only rename instead of reporting the old name as taken", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/foo.txt", newPath: "/dir/Foo.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(true); // both spellings resolve
    mockIsSameEntry.mockResolvedValue(true); // ...to the same entry

    const result = await undoEntry(1000);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledWith("/dir/Foo.txt", "/dir/foo.txt");
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undone");
  });

  it("previewUndo counts a case-only rename as restorable, not occupied", async () => {
    mockFileExists.mockResolvedValue(true);
    mockIsSameEntry.mockResolvedValue(true);

    const preview = await previewUndo([{ oldPath: "/dir/foo.txt", newPath: "/dir/Foo.txt", fileId: "7:1" }]);

    expect(preview).toEqual({ restorable: 1, missing: 0, occupied: 0, replaced: 0, total: 1 });
  });
});

describe("directory-and-children batch undo", () => {
  // Mirrors batchRename in reverse: the forward pass renames children before
  // parents and rewrites their recorded paths under the renamed parent, so
  // the undo must restore the parent first and pick each child up from where
  // the parent's restore carried it.
  const entry = {
    timestamp: 1000,
    description: "Renamed folder and file",
    operations: [
      { oldPath: "/dir/a", newPath: "/dir/b", fileId: "7:1" },
      { oldPath: "/dir/a/f.txt", newPath: "/dir/b/g.txt", fileId: "7:2" },
    ],
  };

  it("restores the parent directory first and undoes the child from its carried location", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([entry]));
    mockLstat.mockImplementation(async (p: string) => (p === "/dir/b" ? { dev: 7, ino: 1 } : { dev: 7, ino: 2 }));
    // The child exists at /dir/a/g.txt — its post-parent-restore location
    mockFileExists.mockImplementation(async (p: string) => p === "/dir/b" || p === "/dir/a/g.txt");

    const result = await undoEntry(1000);

    expect(result).toBe(true);
    expect(mockRename.mock.calls).toEqual([
      ["/dir/b", "/dir/a"],
      ["/dir/a/g.txt", "/dir/a/f.txt"],
    ]);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[0].operations[1].status).toBe("undone");
  });

  it("undoFileOperation finds a child moved by an already-restored parent", async () => {
    const partiallyUndone = {
      ...entry,
      operations: [
        { ...entry.operations[0], status: "undone" },
        { ...entry.operations[1], status: "undo-failed", undoError: "f.txt not found" },
      ],
    };
    mockStorage.getItem.mockResolvedValue(JSON.stringify([partiallyUndone]));
    mockLstat.mockResolvedValue({ dev: 7, ino: 2 });
    mockFileExists.mockImplementation(async (p: string) => p === "/dir/a/g.txt");

    const result = await undoFileOperation(1000, 1);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledWith("/dir/a/g.txt", "/dir/a/f.txt");
  });

  it("getEffectiveOperations remaps children of undone parents", () => {
    const ops = getEffectiveOperations({
      ...entry,
      operations: [{ ...entry.operations[0], status: "undone" }, entry.operations[1]],
    });

    expect(ops[0].newPath).toBe("/dir/a");
    expect(ops[1].newPath).toBe("/dir/a/g.txt");
  });
});

describe("timestamp collisions", () => {
  it("keeps both entries when another instance stamped the same millisecond", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      const theirs = { timestamp: 1000, description: "theirs", operations: [] };
      mockStorage.getItem.mockResolvedValue(JSON.stringify([theirs]));

      await saveToHistory("mine", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }]);

      const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(2);
      // Ours steps forward instead of evicting the colliding entry, and each
      // timestamp still names exactly one entry (the UI's key).
      expect(stored.map((e: { description: string }) => e.description)).toEqual(["mine", "theirs"]);
      expect(stored[0].timestamp).toBe(1001);
      expect(stored[1].timestamp).toBe(1000);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("steps past every colliding timestamp already stored", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify([
          { timestamp: 1000, description: "theirs a", operations: [] },
          { timestamp: 1001, description: "theirs b", operations: [] },
        ]),
      );

      await saveToHistory("mine", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }]);

      const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(3);
      expect(stored[0].timestamp).toBe(1002);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("stays idempotent when a retry re-reads a state that already holds our entry", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
      // The first write is clobbered by a winner that merged our entry into
      // its own state — the retry must neither duplicate ours nor bump it
      // again on account of the copy of itself it finds.
      mockStorage.setItem.mockImplementationOnce(async (_key: string, value: string) => {
        const ours = JSON.parse(value)[0];
        mockStorage.getItem.mockResolvedValue(
          JSON.stringify([{ timestamp: 500, description: "theirs", operations: [] }, ours]),
        );
      });

      await saveToHistory("mine", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }]);

      expect(mockStorage.setItem).toHaveBeenCalledTimes(2);
      const stored = JSON.parse(mockStorage.setItem.mock.calls[1][1]);
      expect(stored.map((e: { description: string }) => e.description)).toEqual(["mine", "theirs"]);
      expect(stored[0].timestamp).toBe(1000);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("write verification", () => {
  it("re-merges and rewrites when another write lands between the write and its verification", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    const concurrent = [{ timestamp: 500, description: "theirs", operations: [] }];
    // First write is clobbered: the verify read sees another instance's state
    mockStorage.setItem.mockImplementationOnce(async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(concurrent));
    });

    await saveToHistory("mine", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }]);

    expect(mockStorage.setItem).toHaveBeenCalledTimes(2);
    const finalStored = JSON.parse(mockStorage.setItem.mock.calls[1][1]);
    expect(finalStored.map((e: { description: string }) => e.description)).toEqual(["mine", "theirs"]);
  });

  it("reports the change unsaved when every write attempt loses its race", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    // Every write is immediately clobbered by another instance
    let clobber = 0;
    mockStorage.setItem.mockImplementation(async () => {
      clobber++;
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify([{ timestamp: clobber, description: "theirs", operations: [] }]),
      );
    });

    await expect(saveToHistory("mine", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }])).rejects.toThrow(
      "Failed to write history",
    );
    expect(mockStorage.setItem).toHaveBeenCalledTimes(3);
  });

  it("tells the user the undo finished but history was not updated when all writes lose", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    let clobber = 0;
    mockStorage.setItem.mockImplementation(async () => {
      clobber++;
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify([{ timestamp: 2000 + clobber, description: "theirs", operations: [] }, ...history]),
      );
    });

    const result = await undoEntry(1000);

    // The file was restored on disk; the unconfirmed history write must not
    // be reported as a completed save.
    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledWith("/dir/b.txt", "/dir/a.txt");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Undo Finished, History Not Updated" }),
    );
  });
});

describe("getHistory entry validation", () => {
  it("drops malformed entries instead of returning them typed", async () => {
    const stored = [
      { timestamp: 2000, description: "good", operations: [] },
      { timestamp: 1500, description: "no operations array" },
      { description: "no timestamp", operations: [] },
      "not an object",
      null,
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(stored));

    const result = await getHistory();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("good");
  });
});
