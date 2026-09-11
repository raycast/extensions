import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getApplications: vi.fn(),
  open: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

vi.mock("./capture-inbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./capture-inbox")>();
  return { ...actual, spoolTextCapture: vi.fn() };
});

import { getApplications, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CaptureInboxError, MAX_CAPTURE_LENGTH, spoolTextCapture } from "./capture-inbox";
import { buildCaptureText, captureToDailyNote, formatTimestamp } from "./reflect";

const TEST_DATE = new Date("2026-07-15T13:21:00.000Z");
const INSTALLED_APP = { name: "Reflect Open", path: "/Applications/Reflect Open.app", bundleId: "app.reflect.desktop" };

/** Simulate a locale that defaults to 24-hour time unless `hour12` is forced. */
function useBritishLocale() {
  return vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation(function (this: Date, _locales, options) {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(this);
  });
}

beforeEach(() => {
  vi.mocked(getApplications).mockResolvedValue([INSTALLED_APP]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(getApplications).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(showToast).mockReset();
  vi.mocked(showFailureToast).mockReset();
  vi.mocked(spoolTextCapture).mockReset();
});

describe("timestamp formatting", () => {
  it("forces the 12-hour option even when the locale defaults to 24-hour time", () => {
    useBritishLocale();

    expect(formatTimestamp("12", TEST_DATE).toLowerCase()).toBe("1:21 pm");
  });

  it("keeps the 24-hour option in 24-hour time", () => {
    useBritishLocale();

    expect(formatTimestamp("24", TEST_DATE)).toBe("13:21");
  });

  it("separates the timestamp and captured thought with a colon", () => {
    useBritishLocale();
    vi.useFakeTimers();
    vi.setSystemTime(TEST_DATE);

    expect(buildCaptureText("Thought", { prependTimestamp: true, timestampFormat: "12" }).toLowerCase()).toBe(
      "1:21 pm: thought",
    );
  });
});

describe("captureToDailyNote", () => {
  it("shows a toast and never queues when there is nothing to append", async () => {
    const ok = await captureToDailyNote("   ");

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Nothing to append" }));
    expect(spoolTextCapture).not.toHaveBeenCalled();
  });

  it("shows a toast and never queues when the text is over the length cap", async () => {
    const ok = await captureToDailyNote("a".repeat(MAX_CAPTURE_LENGTH + 1));

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Text too long" }));
    expect(spoolTextCapture).not.toHaveBeenCalled();
  });

  it("shows a toast and never queues when Reflect Open is not installed", async () => {
    vi.mocked(getApplications).mockResolvedValue([]);

    const ok = await captureToDailyNote("buy milk");

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Reflect Open not found" }));
    expect(spoolTextCapture).not.toHaveBeenCalled();
  });

  it("queues the capture as a task and reports success", async () => {
    vi.mocked(spoolTextCapture).mockResolvedValue(undefined);

    const ok = await captureToDailyNote("buy milk", { isTask: true });

    expect(ok).toBe(true);
    expect(spoolTextCapture).toHaveBeenCalledWith("buy milk", "task");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows a dedicated toast when no Reflect graph is selected", async () => {
    vi.mocked(spoolTextCapture).mockRejectedValue(new CaptureInboxError("no-graph", "no graph selected"));

    const ok = await captureToDailyNote("buy milk");

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "No Reflect graph selected" }));
  });

  it("falls back to a generic failure toast for other queue errors", async () => {
    const error = new CaptureInboxError("io", "disk exploded");
    vi.mocked(spoolTextCapture).mockRejectedValue(error);

    const ok = await captureToDailyNote("buy milk");

    expect(ok).toBe(false);
    expect(showFailureToast).toHaveBeenCalledWith(error, { title: "Couldn't queue the thought" });
  });
});
