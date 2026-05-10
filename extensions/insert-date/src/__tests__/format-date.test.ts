import { formatDate } from "../format-date";

// May 7, 2026, Thursday, 14:30:05
const FIXED = new Date(2026, 4, 7, 14, 30, 5);

describe("formatDate", () => {
  test("ISO default — zero-pads month and day", () => {
    expect(formatDate("%Y-%m-%d", FIXED)).toBe("2026-05-07");
  });
  test("US format", () => {
    expect(formatDate("%m/%d/%Y", FIXED)).toBe("05/07/2026");
  });
  test("EU format", () => {
    expect(formatDate("%d/%m/%Y", FIXED)).toBe("07/05/2026");
  });
  test("long form — full month name, unpadded day", () => {
    expect(formatDate("%B %-d, %Y", FIXED)).toBe("May 7, 2026");
  });
  test("abbreviated — short day and month", () => {
    expect(formatDate("%a, %b %-d", FIXED)).toBe("Thu, May 7");
  });
  test("date + time", () => {
    expect(formatDate("%Y-%m-%d %H:%M", FIXED)).toBe("2026-05-07 14:30");
  });
  test("time only", () => {
    expect(formatDate("%H:%M", FIXED)).toBe("14:30");
  });
  test("two-digit year", () => {
    expect(formatDate("%y", FIXED)).toBe("26");
  });
  test("zero-padded seconds", () => {
    expect(formatDate("%S", FIXED)).toBe("05");
  });
  test("full day name", () => {
    expect(formatDate("%A", FIXED)).toBe("Thursday");
  });
  test("%-d does not zero-pad a single-digit day", () => {
    expect(formatDate("%-d", FIXED)).toBe("7");
  });
  test("%d zero-pads a single-digit day", () => {
    expect(formatDate("%d", FIXED)).toBe("07");
  });
  test("%-d inside longer format does not corrupt %d", () => {
    expect(formatDate("%Y-%m-%d and %-d", FIXED)).toBe("2026-05-07 and 7");
  });
  test("defaults to current date when no second arg", () => {
    const result = formatDate("%Y");
    expect(result).toMatch(/^\d{4}$/);
  });
  test("%B gives full month name (not abbreviated)", () => {
    const jan = new Date(2026, 0, 15, 0, 0, 0); // January — "January" vs "Jan"
    expect(formatDate("%B", jan)).toBe("January");
    expect(formatDate("%b", jan)).toBe("Jan");
  });
  test("%A gives full day name (not abbreviated)", () => {
    const mon = new Date(2026, 0, 5, 0, 0, 0); // Monday Jan 5, 2026
    expect(formatDate("%A", mon)).toBe("Monday");
    expect(formatDate("%a", mon)).toBe("Mon");
  });

  // Human-friendly token tests (YYYY MM DD HH mm ss)
  test("human tokens: YYYY-MM-DD", () => {
    expect(formatDate("YYYY-MM-DD", FIXED)).toBe("2026-05-07");
  });
  test("human tokens: MM/DD/YYYY", () => {
    expect(formatDate("MM/DD/YYYY", FIXED)).toBe("05/07/2026");
  });
  test("human tokens: YYYY-MM-DD HH:mm:ss", () => {
    expect(formatDate("YYYY-MM-DD HH:mm:ss", FIXED)).toBe(
      "2026-05-07 14:30:05",
    );
  });
  test("human tokens: mm (minute) is lowercase, MM (month) is uppercase", () => {
    expect(formatDate("MM", FIXED)).toBe("05"); // month
    expect(formatDate("mm", FIXED)).toBe("30"); // minute
  });
  test("raw strftime still works alongside human tokens", () => {
    // Mixed input should pass through unchanged for strftime tokens
    expect(formatDate("%Y-%m-%d", FIXED)).toBe("2026-05-07");
  });
});
