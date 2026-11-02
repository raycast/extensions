import { beforeEach, describe, expect, it, vi } from "vitest";
const { confirmAlert, getItem, setItem } = vi.hoisted(() => ({
  confirmAlert: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  confirmAlert,
  Alert: { ActionStyle: { Destructive: "destructive", Cancel: "cancel" } },
  LocalStorage: { getItem, setItem },
}));
import { confirmClearRecentUploads } from "./clear-history";

describe("Clear All confirmation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("leaves local state untouched on cancel", async () => {
    confirmAlert.mockResolvedValue(false);
    await expect(confirmClearRecentUploads()).resolves.toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("waits for confirmation then clears only the recent-upload key", async () => {
    let confirm!: (value: boolean) => void;
    confirmAlert.mockReturnValue(
      new Promise<boolean>((resolve) => {
        confirm = resolve;
      }),
    );
    const clearing = confirmClearRecentUploads();
    expect(setItem).not.toHaveBeenCalled();
    confirm(true);
    await expect(clearing).resolves.toBe(true);
    expect(setItem).toHaveBeenCalledExactlyOnceWith("litterbox-recent-uploads", "[]");
    expect(confirmAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("local history"),
        primaryAction: { title: "Clear All", style: "destructive" },
        dismissAction: { title: "Cancel", style: "cancel" },
      }),
    );
  });

  it("does not mutate state if the confirmation API fails", async () => {
    confirmAlert.mockRejectedValue(new Error("Alert unavailable"));
    await expect(confirmClearRecentUploads()).rejects.toThrow("Alert unavailable");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("does not report success when local storage fails", async () => {
    confirmAlert.mockResolvedValue(true);
    setItem.mockRejectedValue(new Error("Storage unavailable"));
    await expect(confirmClearRecentUploads()).rejects.toThrow("Storage unavailable");
  });
});
