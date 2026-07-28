import { describe, expect, it, vi } from "vitest";

import { WingetProgressDetector } from "./progress";

describe("WingetProgressDetector", () => {
  it("parses download progress with current/total format", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Downloading https://example.com/file.exe\n");
    detector.feed("  189 MB /  296 MB\n");

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ type: "downloading", current: 0, total: 0 }));
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "downloading",
        current: 189,
        total: 296,
      }),
    );
  });

  it("parses download progress with current-only format (indeterminate)", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Downloading https://app.warp.dev/download/windows\n");
    detector.feed("  66.6 MB\r  66.7 MB\r  66.8 MB\r");

    const calls = onProgress.mock.calls;
    expect(calls[0]).toEqual([{ type: "downloading", current: 0, total: 0, unit: "MB" }]);
    expect(calls[1]).toEqual([{ type: "downloading", current: 66.6, total: 0, unit: "MB" }]);
    expect(calls[2]).toEqual([{ type: "downloading", current: 66.7, total: 0, unit: "MB" }]);
    expect(calls[3]).toEqual([{ type: "downloading", current: 66.8, total: 0, unit: "MB" }]);
  });

  it("converts KB to MB correctly", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Downloading https://example.com/small.exe\n");
    detector.feed("  512 KB\r  1024 KB\r");

    const calls = onProgress.mock.calls;
    expect(calls[1]?.[0]?.current).toBeCloseTo(0.5, 1);
    expect(calls[2]?.[0]?.current).toBeCloseTo(1.0, 1);
  });

  it("parses mixed-unit download format (KB/MB)", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Downloading https://example.com/file.exe\n");
    detector.feed("  1024 KB / 13.3 MB\n");

    const downloadCalls = onProgress.mock.calls.filter((c) => c[0].type === "downloading" && c[0].total > 0);
    expect(downloadCalls.length).toBeGreaterThan(0);
    expect(downloadCalls[0]?.[0]?.current).toBeCloseTo(1.0, 1);
    expect(downloadCalls[0]?.[0]?.total).toBeCloseTo(13.3, 1);
  });

  it("detects verification phase", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);
    detector.feed("Successfully verified installer hash\n");
    expect(onProgress).toHaveBeenCalledWith({ type: "verifying" });
  });

  it("detects install/uninstall/repair phases", () => {
    const onProgressInstall = vi.fn();
    new WingetProgressDetector(onProgressInstall).feed("Starting package install...\n");
    expect(onProgressInstall).toHaveBeenCalledWith({ type: "installing" });

    const onProgressUninstall = vi.fn();
    new WingetProgressDetector(onProgressUninstall).feed("Starting package uninstall...\n");
    expect(onProgressUninstall).toHaveBeenCalledWith({ type: "uninstalling" });

    const onProgressRepair = vi.fn();
    new WingetProgressDetector(onProgressRepair).feed("Starting package repair...\n");
    expect(onProgressRepair).toHaveBeenCalledWith({ type: "repairing" });
  });

  it("detects success completion", () => {
    const onProgress = vi.fn();
    new WingetProgressDetector(onProgress).feed("Successfully installed\n");
    expect(onProgress).toHaveBeenCalledWith({
      type: "complete",
      success: true,
    });
  });

  it("does not regress state order (e.g., downloading after installing)", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Starting package install...\n");
    detector.feed("  50 MB / 100 MB\n"); // late download line must not regress the state

    const types = onProgress.mock.calls.map((c) => c[0].type);
    expect(types).toContain("installing");
    expect(types).not.toContain("downloading");
  });

  it("handles a phase marker split across chunk boundaries", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Starting package ins");
    detector.feed("tall...\n");

    expect(onProgress).toHaveBeenCalledWith({ type: "installing" });
  });

  it("flush() processes a trailing line without a newline", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("Successfully installed");
    expect(onProgress).not.toHaveBeenCalled();
    detector.flush();
    expect(onProgress).toHaveBeenCalledWith({
      type: "complete",
      success: true,
    });
  });

  it("does not emit spurious download progress for arbitrary text containing a percentage", () => {
    const onProgress = vi.fn();
    const detector = new WingetProgressDetector(onProgress);

    detector.feed("This package is 100%covered by warranty\n");

    const downloads = onProgress.mock.calls.filter((c) => c[0].type === "downloading");
    expect(downloads).toHaveLength(0);
  });

  it("retains the full (capped) buffer for result interpretation", () => {
    const detector = new WingetProgressDetector(vi.fn());
    detector.feed("Some output line\n");
    detector.feed("Another line\n");
    expect(detector.getBuffer()).toContain("Some output line");
    expect(detector.getBuffer()).toContain("Another line");
  });
});
