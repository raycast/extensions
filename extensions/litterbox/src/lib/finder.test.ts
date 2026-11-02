import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { getSelectedFinderItems } = vi.hoisted(() => ({ getSelectedFinderItems: vi.fn() }));
vi.mock("@raycast/api", () => ({ getSelectedFinderItems }));
import { getFinderFiles } from "./finder";

describe("Finder selection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns only unique selected paths without uploading or reading contents", async () => {
    getSelectedFinderItems.mockResolvedValue([
      { path: "/synthetic/one.txt" },
      { path: "/synthetic/one.txt" },
      { path: "/synthetic/two.png" },
    ]);
    await expect(getFinderFiles()).resolves.toEqual(["/synthetic/one.txt", "/synthetic/two.png"]);
  });

  it("explains an empty selection", async () => {
    getSelectedFinderItems.mockResolvedValue([]);
    await expect(getFinderFiles()).rejects.toThrow("No files selected");
  });

  it("explains Finder/API rejection without falling back to other files", async () => {
    getSelectedFinderItems.mockRejectedValue(new Error("Finder is not frontmost"));
    await expect(getFinderFiles()).rejects.toThrow("Select files in Finder");
  });

  it("guards unsupported platforms before accessing Finder", async () => {
    const platform = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    try {
      await expect(getFinderFiles()).rejects.toThrow("only available on macOS");
      expect(getSelectedFinderItems).not.toHaveBeenCalled();
    } finally {
      platform.mockRestore();
    }
  });
});
