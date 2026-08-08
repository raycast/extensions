import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage, showToast } from "@raycast/api";

const { mockRenameFn, mockFileExistsFn, mockStatFn } = vi.hoisted(() => ({
  mockRenameFn: vi.fn().mockResolvedValue(undefined),
  mockFileExistsFn: vi.fn().mockResolvedValue(false),
  mockStatFn: vi.fn().mockRejectedValue(new Error("ENOENT")),
}));

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    default: { ...actual, rename: mockRenameFn, stat: mockStatFn },
    rename: mockRenameFn,
    stat: mockStatFn,
  };
});

vi.mock("../lib/files", () => ({
  fileExists: mockFileExistsFn,
  batchRename: vi.fn(),
}));

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
const mockStat = mockStatFn;

beforeEach(() => {
  // Reset implementations too (not just call history), so a per-test override
  // like a rejecting setItem cannot leak into later tests; then re-install the
  // defaults every test starts from.
  vi.resetAllMocks();
  mockRename.mockResolvedValue(undefined);
  mockFileExists.mockResolvedValue(false);
  mockStat.mockResolvedValue({ dev: 7, ino: 1 });
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
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
  it("returns false when index is beyond history length", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const result = await undoToPoint(0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("returns false when index equals history length", async () => {
    const history = [{ timestamp: 1000, description: "op1", operations: [{ oldPath: "/a.txt", newPath: "/b.txt" }] }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    const result = await undoToPoint(1);

    expect(result).toBe(false);
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

    const result = await undoToPoint(1);

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

  it("undoes a single entry at index 0", async () => {
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

    const result = await undoToPoint(0);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(2);
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[1].operations[0].status).toBeUndefined();

    // index 0 means "1 operation" (singular)
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

    const result = await undoToPoint(0);

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

    const result = await undoToPoint(0);

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

    const result = await undoToPoint(0);

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

    const result = await undoToPoint(0);

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
  it("returns false for an out-of-range entry or operation index", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));

    expect(await undoFileOperation(1, 0)).toBe(false);
    expect(await undoFileOperation(0, 1)).toBe(false);
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

    const result = await undoFileOperation(0, 1);

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

    const result = await undoFileOperation(0, 0);

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

    const result = await undoFileOperation(0, 0);

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

    const result = await undoFileOperation(0, 0);

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

    const result = await undoFileOperation(0, 0);

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
    expect(message).toBe('This will restore the original names of 3 files from "Renamed 3 files"');
  });

  it("uses the singular for a single file", () => {
    const message = describeUndoPreview(
      { restorable: 1, missing: 0, occupied: 0, replaced: 0, total: 1 },
      '"Renamed 1 file"',
    );
    expect(message).toContain("of 1 file from");
  });

  it("summarizes all three conflict kinds and the skip behavior", () => {
    const message = describeUndoPreview(
      { restorable: 15, missing: 2, occupied: 1, replaced: 1, total: 19 },
      '"Renamed 19 files"',
    );
    expect(message).toContain('15 of 19 files from "Renamed 19 files" can be restored');
    expect(message).toContain("2 were moved or deleted");
    expect(message).toContain("1 has the original name taken");
    expect(message).toContain("1 is not verifiably the renamed file");
    expect(message).toContain("Conflicted files will be skipped and can be retried later");
  });
});

describe("undoEntry", () => {
  it("returns false for an index with no entry", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const result = await undoEntry(0);

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

    const result = await undoEntry(1);

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

    const result = await undoEntry(0);

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

    const result = await undoEntry(0);

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
    mockStat.mockResolvedValue({ dev: 7, ino: 4242 });

    await saveToHistory("op", [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt", fileId: "7:1" }]);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].fileId).toBe("7:4242");
  });

  it("saveToHistory omits fileId when the file cannot be statted", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockStat.mockRejectedValue(new Error("ENOENT"));

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
    mockStat.mockResolvedValue({ dev: 7, ino: 2 }); // different inode: replacement file

    const result = await undoEntry(0);

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

    const result = await undoEntry(0);

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
    mockStat.mockRejectedValue(new Error("EACCES"));

    const result = await undoEntry(0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].operations[0].undoError).toContain("could not be verified");
  });

  it("previewUndo counts a replaced destination separately", async () => {
    mockFileExists.mockImplementation(async (path: string) => path === "/dir/b.txt");
    mockStat.mockResolvedValue({ dev: 7, ino: 2 });

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

    const result = await undoEntry(0);

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

    const result = await undoFileOperation(0, 1);

    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    // Both undos survive: theirs on file 0, ours on file 1
    expect(stored[0].operations[0].status).toBe("undone");
    expect(stored[0].operations[1].status).toBe("undone");
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
