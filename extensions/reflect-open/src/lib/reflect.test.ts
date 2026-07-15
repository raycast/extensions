import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getApplications: vi.fn(),
  open: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

import { buildCaptureText, formatTimestamp } from "./reflect";

const TEST_DATE = new Date("2026-07-15T13:21:00.000Z");

/** Simulate a locale that defaults to 24-hour time unless `hour12` is forced. */
function useBritishLocale() {
  return vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation(function (this: Date, _locales, options) {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(this);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
