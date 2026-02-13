import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage, showToast } from "@raycast/api";

const { mockRenameFn, mockFileExistsFn } = vi.hoisted(() => ({
  mockRenameFn: vi.fn().mockResolvedValue(undefined),
  mockFileExistsFn: vi.fn().mockResolvedValue(false),
}));

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    default: { ...actual, rename: mockRenameFn },
    rename: mockRenameFn,
  };
});

vi.mock("../lib/files", () => ({
  fileExists: mockFileExistsFn,
  batchRename: vi.fn(),
}));

import {
  getHistory,
  getUndoCount,
  saveToHistory,
  clearHistory,
  formatHistoryEntry,
  undoLastRename,
  undoToPoint,
} from "../lib/history";
import { MAX_HISTORY_ENTRIES, STORAGE_KEYS } from "../lib/constants";

const mockStorage = LocalStorage as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};
const mockShowToast = showToast as ReturnType<typeof vi.fn>;
const mockRename = mockRenameFn;
const mockFileExists = mockFileExistsFn;

beforeEach(() => {
  vi.clearAllMocks();
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

describe("getUndoCount", () => {
  it("returns 0 when no history", async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const count = await getUndoCount();
    expect(count).toBe(0);
  });

  it("returns correct count", async () => {
    const entries = [
      { timestamp: 1000, description: "op1", operations: [] },
      { timestamp: 2000, description: "op2", operations: [] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    const count = await getUndoCount();
    expect(count).toBe(2);
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
    expect(stored[0].operations).toEqual([{ oldPath: "/a.txt", newPath: "/b.txt" }]);
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

describe("formatHistoryEntry", () => {
  it("returns formatted string with time and description", () => {
    const entry = {
      timestamp: new Date("2024-01-15T14:30:00").getTime(),
      description: "Renamed 5 files",
      operations: [],
    };
    const result = formatHistoryEntry(entry);
    expect(result).toContain("Renamed 5 files");
    expect(result).toContain(" - ");
  });
});

describe("undoLastRename", () => {
  it("returns false and shows toast when history is empty", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const result = await undoLastRename();

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Nothing to Undo",
        message: "No rename operations in history",
      }),
    );
  });

  it("successfully undoes last rename and removes entry from history", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 2 files",
        operations: [
          { oldPath: "/dir/original1.txt", newPath: "/dir/renamed1.txt" },
          { oldPath: "/dir/original2.txt", newPath: "/dir/renamed2.txt" },
        ],
      },
      { timestamp: 500, description: "Earlier op", operations: [] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(true);
    // For newPath checks: file exists. For oldPath checks: file does not exist.
    mockFileExists.mockImplementation(async (path: string) => {
      if (path === "/dir/renamed1.txt" || path === "/dir/renamed2.txt") return true;
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    const result = await undoLastRename();

    expect(result).toBe(true);
    // Operations are reversed, so renamed2 is undone first, then renamed1
    expect(mockRename).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenCalledWith("/dir/renamed2.txt", "/dir/original2.txt");
    expect(mockRename).toHaveBeenCalledWith("/dir/renamed1.txt", "/dir/original1.txt");

    // History should have the first entry removed
    const storedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].description).toBe("Earlier op");

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Reverted: Renamed 2 files",
      }),
    );
  });

  it("reports partial undo when renamed file (newPath) is not found", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 2 files",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => {
      // d.txt exists (can be undone), b.txt does not exist (cannot be undone)
      if (path === "/dir/d.txt") return true;
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    const result = await undoLastRename();

    expect(result).toBe(true);
    // Only one rename should happen (d.txt -> c.txt)
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Partial Undo",
      }),
    );
  });

  it("reports partial undo when old path already exists", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 2 files",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    // Both newPath files exist, but one oldPath also exists (conflict)
    mockFileExists.mockImplementation(async (path: string) => {
      if (path === "/dir/b.txt") return true;
      if (path === "/dir/d.txt") return true;
      if (path === "/dir/c.txt") return true; // old path exists = conflict
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    const result = await undoLastRename();

    expect(result).toBe(true);
    // Only b.txt -> a.txt should succeed (d.txt -> c.txt skipped because c.txt exists)
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith("/dir/b.txt", "/dir/a.txt");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Partial Undo",
      }),
    );
  });

  it("reports partial undo when rename throws an error", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 2 files",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => {
      // Both newPaths exist, neither oldPath exists
      if (path === "/dir/b.txt" || path === "/dir/d.txt") return true;
      return false;
    });
    // First rename succeeds, second throws
    mockRename.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Permission denied"));

    const result = await undoLastRename();

    // Operations are reversed: d.txt->c.txt first (succeeds), then b.txt->a.txt (fails)
    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Partial Undo",
      }),
    );
  });

  it("returns false when all operations fail", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 1 file",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    // newPath does not exist -> all operations fail
    mockFileExists.mockResolvedValue(false);

    const result = await undoLastRename();

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Undo Failed",
      }),
    );
  });

  it("still removes the entry from history even when undo fails", async () => {
    const history = [
      {
        timestamp: 1000,
        description: "Renamed 1 file",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
      { timestamp: 500, description: "Kept entry", operations: [] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(false);

    await undoLastRename();

    const storedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].description).toBe("Kept entry");
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

  it("successfully undoes multiple entries up to the given index", async () => {
    const history = [
      {
        timestamp: 3000,
        description: "Third op",
        operations: [{ oldPath: "/dir/e.txt", newPath: "/dir/f.txt" }],
      },
      {
        timestamp: 2000,
        description: "Second op",
        operations: [{ oldPath: "/dir/c.txt", newPath: "/dir/d.txt" }],
      },
      {
        timestamp: 1000,
        description: "First op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => {
      // All newPaths exist, no oldPaths exist
      if (path === "/dir/f.txt" || path === "/dir/d.txt") return true;
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    // Undo entries 0 and 1 (Third op and Second op)
    const result = await undoToPoint(1);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenCalledWith("/dir/f.txt", "/dir/e.txt");
    expect(mockRename).toHaveBeenCalledWith("/dir/d.txt", "/dir/c.txt");

    // History should only contain the third (index 2) entry
    const storedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].description).toBe("First op");

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
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
      { timestamp: 1000, description: "Older op", operations: [] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => {
      if (path === "/dir/b.txt") return true;
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(0);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);

    const storedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].description).toBe("Older op");

    // index 0 means "1 operation" (singular)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "success",
        title: "Undo Successful",
        message: "Reverted 1 operation (1 files)",
      }),
    );
  });

  it("returns true with partial undo toast when some operations fail", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Op with mixed results",
        operations: [
          { oldPath: "/dir/a.txt", newPath: "/dir/b.txt" },
          { oldPath: "/dir/c.txt", newPath: "/dir/d.txt" },
        ],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockImplementation(async (path: string) => {
      // b.txt exists (can undo), d.txt does not exist (cannot undo)
      if (path === "/dir/b.txt") return true;
      return false;
    });
    mockRename.mockResolvedValue(undefined);

    const result = await undoToPoint(0);

    expect(result).toBe(true);
    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Partial Undo",
      }),
    );
  });

  it("returns false when all operations fail", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Doomed op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(false);

    const result = await undoToPoint(0);

    expect(result).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Undo Failed",
      }),
    );
  });

  it("still updates history even when all operations fail", async () => {
    const history = [
      {
        timestamp: 2000,
        description: "Doomed op",
        operations: [{ oldPath: "/dir/a.txt", newPath: "/dir/b.txt" }],
      },
      { timestamp: 1000, description: "Survivor", operations: [] },
    ];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(history));
    mockFileExists.mockResolvedValue(false);

    await undoToPoint(0);

    const storedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].description).toBe("Survivor");
  });
});
