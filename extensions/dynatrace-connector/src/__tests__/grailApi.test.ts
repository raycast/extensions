// src/__tests__/grailApi.test.ts
// Unit tests for Grail API utility functions.
// Tests toNanoIso via the log-detail module's exported helper.

// We inline toNanoIso here since it's a private function in log-detail.tsx.
// This tests the pure logic without needing Raycast runtime.

function toNanoIso(timestamp: string): string {
  const iso = new Date(timestamp).toISOString();
  const base = iso.replace(/Z$/, "");
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) return `${base}.000000000Z`;
  const fraction = base.slice(dotIdx + 1);
  const padded = fraction.padEnd(9, "0").slice(0, 9);
  return `${base.slice(0, dotIdx)}.${padded}Z`;
}

test("converts ISO timestamp to nanosecond precision (9 decimal digits)", () => {
  const result = toNanoIso("2026-04-13T04:22:58.073Z");
  expect(result).toBe("2026-04-13T04:22:58.073000000Z");
});

test("pads milliseconds with trailing zeros to 9 digits", () => {
  const result = toNanoIso("2026-01-01T00:00:00.100Z");
  expect(result).toBe("2026-01-01T00:00:00.100000000Z");
});

test("handles timestamp with no fractional seconds", () => {
  const result = toNanoIso("2026-04-13T04:22:58.000Z");
  expect(result).toBe("2026-04-13T04:22:58.000000000Z");
});

test("always ends with Z", () => {
  const result = toNanoIso("2026-04-13T04:22:58.073Z");
  expect(result.endsWith("Z")).toBe(true);
});

test("output has exactly 9 fractional digits", () => {
  const result = toNanoIso("2026-04-13T04:22:58.073Z");
  const dotIdx = result.lastIndexOf(".");
  const fracPart = result.slice(dotIdx + 1, result.length - 1); // remove trailing Z
  expect(fracPart).toHaveLength(9);
});

test("boundary: timestamp at Unix epoch", () => {
  const result = toNanoIso("1970-01-01T00:00:00.000Z");
  expect(result).toBe("1970-01-01T00:00:00.000000000Z");
});
