/**
 * Tests for the shared Finder-selection loader and its noun helper — the
 * folder-only filter, the empty-selection guard, and the mode-aware wording.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSelectedFinderItems, popToRoot, showToast } from "@raycast/api";
import type { FileInfo } from "../types";
import { MOCK_DIR, MOCK_JPG, MOCK_TXT } from "./fixtures/files";

const { mockGetFileInfo } = vi.hoisted(() => ({
  mockGetFileInfo: vi.fn(),
}));

vi.mock("../lib/files", () => ({
  getFileInfo: mockGetFileInfo,
}));

import { itemNoun, loadSelection } from "../lib/selection";

const mockGetSelectedFinderItems = getSelectedFinderItems as ReturnType<typeof vi.fn>;
const mockShowToast = showToast as ReturnType<typeof vi.fn>;
const mockPopToRoot = popToRoot as ReturnType<typeof vi.fn>;

const SECOND_DIR: FileInfo = {
  path: "/tmp/test/archive",
  name: "archive",
  baseName: "archive",
  extension: "",
  isDirectory: true,
};

/** Wire the Finder selection to the given FileInfo fixtures. */
function selectItems(infos: FileInfo[]): void {
  mockGetSelectedFinderItems.mockResolvedValue(infos.map((info) => ({ path: info.path })));
  mockGetFileInfo.mockImplementation(async (path: string) => {
    const match = infos.find((info) => info.path === path);
    if (!match) throw new Error(`unexpected path ${path}`);
    return match;
  });
}

/** The title of the toast shown by the most recent call. */
function lastToastTitle(): string {
  return mockShowToast.mock.calls.at(-1)?.[0]?.title;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockShowToast.mockResolvedValue(undefined);
  mockPopToRoot.mockResolvedValue(undefined);
});

describe("itemNoun", () => {
  it("uses the file noun when not in folder mode", () => {
    expect(itemNoun(false, 1)).toBe("file");
    expect(itemNoun(false, 2)).toBe("files");
    expect(itemNoun(false, 0)).toBe("files");
  });

  it("uses the folder noun in folder mode", () => {
    expect(itemNoun(true, 1)).toBe("folder");
    expect(itemNoun(true, 2)).toBe("folders");
    expect(itemNoun(true, 0)).toBe("folders");
  });
});

describe("loadSelection filtering", () => {
  it("keeps only directories in folder mode", async () => {
    selectItems([MOCK_JPG, MOCK_DIR, MOCK_TXT, SECOND_DIR]);
    expect(await loadSelection(true)).toEqual([MOCK_DIR, SECOND_DIR]);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("keeps everything when not in folder mode", async () => {
    selectItems([MOCK_JPG, MOCK_DIR, MOCK_TXT]);
    expect(await loadSelection(false)).toEqual([MOCK_JPG, MOCK_DIR, MOCK_TXT]);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe("loadSelection empty-selection guard", () => {
  it("aborts with a folder-worded toast when the selection holds no folders", async () => {
    selectItems([MOCK_JPG, MOCK_TXT]);
    expect(await loadSelection(true)).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one folder in Finder");
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("aborts with the folder noun when nothing is selected in folder mode", async () => {
    selectItems([]);
    expect(await loadSelection(true)).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one folder or open a Finder window");
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("aborts with the file noun when nothing is selected in file mode", async () => {
    selectItems([]);
    expect(await loadSelection(false)).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one file or open a Finder window");
    expect(mockPopToRoot).toHaveBeenCalled();
  });
});

describe("loadSelection failures", () => {
  it("reports a Finder failure with the file noun", async () => {
    mockGetSelectedFinderItems.mockRejectedValue(new Error("no Finder window"));
    expect(await loadSelection(false)).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to fetch files",
        message: "Please make sure a Finder window is open and files are selected",
      }),
    );
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("reports a Finder failure with the folder noun", async () => {
    mockGetSelectedFinderItems.mockRejectedValue(new Error("no Finder window"));
    expect(await loadSelection(true)).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to fetch folders",
        message: "Please make sure a Finder window is open and folders are selected",
      }),
    );
  });

  it("reports a stat failure rather than renaming a partial selection", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: MOCK_DIR.path }]);
    mockGetFileInfo.mockRejectedValue(new Error("ENOENT"));
    expect(await loadSelection(true)).toBeNull();
    expect(lastToastTitle()).toBe("Failed to fetch folders");
  });
});
