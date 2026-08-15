import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Alert: { ActionStyle: { Destructive: "destructive" } },
  confirmAlert: vi.fn(),
}));

vi.mock("../src/lib/browser", () => ({
  closeTab: vi.fn(),
  listTabs: vi.fn(),
}));

import { confirmAlert } from "@raycast/api";
import { closeTab, listTabs } from "../src/lib/browser";
import closeTabsTool from "../src/tools/close-tabs";
import { AsideTab } from "../src/types";

const currentTabs: AsideTab[] = [
  {
    id: "tab-1",
    windowId: "window-1",
    windowIndex: 1,
    windowMode: "normal",
    title: "Current title",
    url: "https://example.com/current",
    loading: false,
    active: true,
  },
  {
    id: "tab-2",
    windowId: "window-1",
    windowIndex: 1,
    windowMode: "normal",
    title: "Second tab",
    url: "https://example.com/second",
    loading: false,
    active: false,
  },
];

describe("Close Tabs AI tool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listTabs).mockResolvedValue(currentTabs);
  });

  it("shows current Aside data and closes nothing when canceled", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);

    const result = await closeTabsTool({
      tabsJson: '[{"tabId":"tab-1","windowId":"window-1","title":"Wrong title"}]',
    });

    expect(confirmAlert).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Current title\n  https://example.com/current") }),
    );
    expect(closeTab).not.toHaveBeenCalled();
    expect(result).toEqual({ canceled: true, closed: [], failed: [] });
  });

  it("rejects stale IDs before showing confirmation", async () => {
    await expect(closeTabsTool({ tabsJson: '[{"tabId":"missing","windowId":"window-1"}]' })).rejects.toThrow(
      /no longer available/,
    );
    expect(confirmAlert).not.toHaveBeenCalled();
  });

  it("reports partial close failures", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(true);
    vi.mocked(closeTab).mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("Tab disappeared"));

    const result = await closeTabsTool({
      tabsJson: '[{"tabId":"tab-1","windowId":"window-1"},{"tabId":"tab-2","windowId":"window-1"}]',
    });

    expect(result).toEqual({
      canceled: false,
      closed: ["tab-1"],
      failed: [{ tabId: "tab-2", message: "Tab disappeared" }],
    });
  });
});
