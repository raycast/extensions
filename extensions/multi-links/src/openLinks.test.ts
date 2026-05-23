import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @raycast/api BEFORE importing openLinks. vi.mock is hoisted to top of file,
// so the mock is in place by the time openLinks.ts is evaluated.
vi.mock("@raycast/api", () => ({
  open: vi.fn().mockResolvedValue(undefined),
  confirmAlert: vi.fn().mockResolvedValue(true),
  getPreferenceValues: vi.fn(),
  Alert: { ActionStyle: { Destructive: "destructive", Cancel: "cancel" } },
  Icon: { Globe: "globe" },
  // P4 Plan 01 Task 01.3: openItems now calls recordHistory (LD-P4-01) which
  // touches LocalStorage. Mocked as no-ops so existing assertions about open()
  // call counts stay valid; the fire-and-forget history call is harmless here.
  LocalStorage: {
    getItem: vi.fn().mockResolvedValue(undefined),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

import { openLinks } from "./openLinks";
import { open, confirmAlert, getPreferenceValues } from "@raycast/api";

// Convenience: build a raw Preferences blob the way Raycast surfaces it (textfields as strings).
function rawPrefs(
  overrides: Partial<{
    browser: unknown;
    openDelayMs: string;
    openAnyUriType: boolean;
    confirmEnabled: boolean;
    confirmThreshold: string;
  }> = {},
) {
  return {
    browser: undefined,
    openDelayMs: "0",
    openAnyUriType: true,
    confirmEnabled: true,
    confirmThreshold: "5",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: openAlert returns true (user clicks Open All).
  vi.mocked(confirmAlert).mockResolvedValue(true);
  vi.mocked(open).mockResolvedValue(undefined);
});

describe("openLinks — confirm gate (SAFE-01..04)", () => {
  it("LD-P3-02: triggers confirmAlert when count >= threshold and confirmEnabled=true", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ confirmEnabled: true, confirmThreshold: "5" }));
    // 5 distinct web URLs => 5 items after extract.
    const text = "https://a.com https://b.com https://c.com https://d.com https://e.com";

    const result = await openLinks(text, { source: "selection" });

    expect(confirmAlert).toHaveBeenCalledOnce();
    const call = vi.mocked(confirmAlert).mock.calls[0][0];
    expect(call).toMatchObject({ title: "Open 5 links?" });
    // Breakdown + preview both rendered into message.
    expect(call.message).toContain("Web: 5");
    expect(call.message).toContain("https://a.com");
    expect(call.message).toContain("https://e.com");
    // No "...and N more" since exactly 5.
    expect(call.message).not.toContain("more");
    expect(result.opened).toBe(5);
    expect(result.cancelled).toBeUndefined();
  });

  it("skips confirmAlert when count is below threshold", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ confirmEnabled: true, confirmThreshold: "5" }));
    // 4 web URLs, threshold 5 => no confirm dialog.
    const text = "https://a.com https://b.com https://c.com https://d.com";

    const result = await openLinks(text, { source: "selection" });

    expect(confirmAlert).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(4);
    expect(result.opened).toBe(4);
  });

  it("SAFE-04: skips confirmAlert entirely when confirmEnabled=false, regardless of count", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ confirmEnabled: false, confirmThreshold: "5" }));
    // 10 URLs, well above threshold, but pref disabled.
    const text = Array.from({ length: 10 }, (_, n) => `https://site${n}.com`).join(" ");

    const result = await openLinks(text, { source: "selection" });

    expect(confirmAlert).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(10);
    expect(result.opened).toBe(10);
  });

  it("Cancel returns silent (no opens, cancelled=true)", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ confirmEnabled: true, confirmThreshold: "5" }));
    // User clicks Cancel.
    vi.mocked(confirmAlert).mockResolvedValueOnce(false);
    const text = "https://a.com https://b.com https://c.com https://d.com https://e.com";

    const result = await openLinks(text, { source: "selection" });

    expect(confirmAlert).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      total: 5,
      opened: 0,
      failed: 0,
      cancelled: true,
    });
    expect(result.failures).toEqual([]);
  });
});

describe("openLinks — openOne routing (PERF-03)", () => {
  it("routes web items through picked browser bundleId and non-web items to default", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(
      rawPrefs({
        browser: {
          name: "Example Browser",
          path: "/Applications/Example.app",
          bundleId: "com.example.bundle",
        },
        openDelayMs: "0",
        confirmEnabled: false,
      }),
    );
    // One of each routed-relevant type. Use known-good URIs from existing extractors.
    const text = "https://web.com /Users/foo/bar.txt mailto:a@b.com obsidian://open?x=1 docs/architecture.md";

    await openLinks(text, { source: "selection" });

    // We expect 5 open() calls. Web → 2-arg; rest → 1-arg.
    const calls = vi.mocked(open).mock.calls;
    expect(calls.length).toBe(5);

    const webCalls = calls.filter((c) => c[0] === "https://web.com");
    expect(webCalls).toHaveLength(1);
    expect(webCalls[0][1]).toBe("com.example.bundle");

    // The other 4 are non-web. Each should be a 1-arg open() (second slot undefined).
    const nonWebCalls = calls.filter((c) => c[0] !== "https://web.com");
    expect(nonWebCalls).toHaveLength(4);
    for (const c of nonWebCalls) {
      expect(c[1]).toBeUndefined();
    }
  });

  it("when no browser pref is set, web items pass only the URL (no second arg)", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(
      rawPrefs({ browser: undefined, openDelayMs: "0", confirmEnabled: false }),
    );
    const text = "https://a.com https://b.com";

    await openLinks(text, { source: "selection" });

    const calls = vi.mocked(open).mock.calls;
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c[1]).toBeUndefined();
    }
  });
});

describe("openLinks — sequential delay timing (PERF-02)", () => {
  // LD-P3-06: delay AFTER each item except the last. items.length - 1 sleeps total.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules exactly items.length - 1 setTimeouts when delayMs > 0", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ openDelayMs: "100", confirmEnabled: false }));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const text = "https://a.com https://b.com https://c.com";

    // Drive the promise to completion alongside the fake clock.
    const p = openLinks(text, { source: "selection" });
    await vi.runAllTimersAsync();
    const result = await p;

    // Count only the sleeps openSequential issues (100ms). vitest's runAllTimersAsync
    // may schedule its own microtask timers, so filter on duration.
    const sleepCalls = setTimeoutSpy.mock.calls.filter((c) => c[1] === 100);
    expect(sleepCalls).toHaveLength(2); // 3 items → 2 inter-item sleeps
    expect(result.opened).toBe(3);
    expect(open).toHaveBeenCalledTimes(3);
  });

  it("schedules zero setTimeouts of the configured delay when only one item", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ openDelayMs: "100", confirmEnabled: false }));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const text = "https://only.com";

    const p = openLinks(text, { source: "selection" });
    await vi.runAllTimersAsync();
    const result = await p;

    const sleepCalls = setTimeoutSpy.mock.calls.filter((c) => c[1] === 100);
    expect(sleepCalls).toHaveLength(0);
    expect(result.opened).toBe(1);
  });
});

describe("openLinks — openAnyUriType filter (PREFS-03)", () => {
  it("when openAnyUriType=false, only web items pass through; non-web silently skipped", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ openAnyUriType: false, confirmEnabled: false }));
    // 5 mixed-type items: 2 web + 3 non-web. Only the 2 web should be opened.
    const text = "https://a.com https://b.com mailto:c@d.com obsidian://x /Users/foo/bar.txt";

    const result = await openLinks(text, { source: "selection" });

    expect(open).toHaveBeenCalledTimes(2);
    const urls = vi.mocked(open).mock.calls.map((c) => c[0]);
    expect(urls).toEqual(expect.arrayContaining(["https://a.com", "https://b.com"]));
    // Critical: skipped items do NOT appear in failures[]. They're silent.
    expect(result.total).toBe(2);
    expect(result.opened).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("when openAnyUriType=true (default), all extracted types are opened", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue(rawPrefs({ openAnyUriType: true, confirmEnabled: false }));
    const text = "https://a.com https://b.com mailto:c@d.com obsidian://x /Users/foo/bar.txt";

    const result = await openLinks(text, { source: "selection" });

    expect(open).toHaveBeenCalledTimes(5);
    expect(result.opened).toBe(5);
  });
});
