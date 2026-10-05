/**
 * Tests for the shared Finder-selection loader, the scope filter and the noun
 * helper — one target type per command, the empty-selection guards both ways,
 * and the scope-aware wording.
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

import { filterByScope, itemNoun, loadSelection } from "../lib/selection";

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
  it("uses the file noun in files scope", () => {
    expect(itemNoun("files", 1)).toBe("file");
    expect(itemNoun("files", 2)).toBe("files");
    expect(itemNoun("files", 0)).toBe("files");
  });

  it("uses the folder noun in folders scope", () => {
    expect(itemNoun("folders", 1)).toBe("folder");
    expect(itemNoun("folders", 2)).toBe("folders");
    expect(itemNoun("folders", 0)).toBe("folders");
  });

  it("uses the neutral noun when the scope covers both", () => {
    expect(itemNoun("both", 1)).toBe("item");
    expect(itemNoun("both", 2)).toBe("items");
    expect(itemNoun("both", 0)).toBe("items");
  });
});

describe("filterByScope", () => {
  const mixed = [MOCK_JPG, MOCK_DIR, MOCK_TXT, SECOND_DIR];

  it("keeps only files in files scope", () => {
    expect(filterByScope(mixed, "files")).toEqual([MOCK_JPG, MOCK_TXT]);
  });

  it("keeps only folders in folders scope", () => {
    expect(filterByScope(mixed, "folders")).toEqual([MOCK_DIR, SECOND_DIR]);
  });

  it("keeps everything when the scope covers both", () => {
    expect(filterByScope(mixed, "both")).toEqual(mixed);
  });

  it("returns a copy rather than the input array", () => {
    expect(filterByScope(mixed, "both")).not.toBe(mixed);
  });

  it("yields an empty working set when nothing matches", () => {
    expect(filterByScope([MOCK_DIR, SECOND_DIR], "files")).toEqual([]);
    expect(filterByScope([MOCK_JPG, MOCK_TXT], "folders")).toEqual([]);
  });
});

describe("loadSelection filtering", () => {
  it("keeps only directories in folders mode", async () => {
    selectItems([MOCK_JPG, MOCK_DIR, MOCK_TXT, SECOND_DIR]);
    expect(await loadSelection("folders")).toEqual([MOCK_DIR, SECOND_DIR]);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("filters directories out in files mode", async () => {
    selectItems([MOCK_JPG, MOCK_DIR, MOCK_TXT, SECOND_DIR]);
    expect(await loadSelection("files")).toEqual([MOCK_JPG, MOCK_TXT]);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe("loadSelection empty-selection guard", () => {
  it("aborts with a folder-worded toast when the selection holds no folders", async () => {
    selectItems([MOCK_JPG, MOCK_TXT]);
    expect(await loadSelection("folders")).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one folder in Finder");
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("aborts with a file-worded toast when the selection holds no files", async () => {
    selectItems([MOCK_DIR, SECOND_DIR]);
    expect(await loadSelection("files")).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one file in Finder");
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("aborts with the folder noun when nothing is selected in folders mode", async () => {
    selectItems([]);
    expect(await loadSelection("folders")).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one folder or open a Finder window");
    expect(mockPopToRoot).toHaveBeenCalled();
  });

  it("aborts with the file noun when nothing is selected in files mode", async () => {
    selectItems([]);
    expect(await loadSelection("files")).toBeNull();
    expect(lastToastTitle()).toBe("Please select at least one file or open a Finder window");
    expect(mockPopToRoot).toHaveBeenCalled();
  });
});

describe("loadSelection failures", () => {
  it("reports a Finder failure with the file noun", async () => {
    mockGetSelectedFinderItems.mockRejectedValue(new Error("no Finder window"));
    expect(await loadSelection("files")).toBeNull();
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
    expect(await loadSelection("folders")).toBeNull();
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
    expect(await loadSelection("folders")).toBeNull();
    expect(lastToastTitle()).toBe("Failed to fetch folders");
  });
});
