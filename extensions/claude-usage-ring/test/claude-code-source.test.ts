import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parseRateLimits, readClaudeCodeUsage } from "../src/lib/claude-code-source";

const dir = mkdtempSync(join(tmpdir(), "usage-ring-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("parseRateLimits", () => {
  it("maps the status line rate_limits shape", () => {
    const u = parseRateLimits(
      {
        five_hour: { used_percentage: 23.5, resets_at: 1738425600 },
        seven_day: { used_percentage: 4, resets_at: 1738900000 },
      },
      123,
    );
    expect(u).toEqual({
      fiveHour: { utilization: 23.5, resetsAt: "2025-02-01T16:00:00.000Z", lockedReason: null },
      sevenDay: { utilization: 4, resetsAt: new Date(1738900000 * 1000).toISOString(), lockedReason: null },
      sevenDayOpus: null,
      sevenDaySonnet: null,
      fetchedAt: 123,
      origin: "claude-code",
    });
  });
  it("tolerates absent windows, clamps, and rejects empty input", () => {
    expect(parseRateLimits({ five_hour: { used_percentage: 120 } }, 1)?.fiveHour).toEqual({
      utilization: 100,
      resetsAt: null,
      lockedReason: null,
    });
    expect(parseRateLimits({ spend_limit: { used_percentage: 5 } }, 1)).toBeNull();
    expect(parseRateLimits(null, 1)).toBeNull();
    expect(parseRateLimits({ five_hour: { used_percentage: "5" } }, 1)).toBeNull();
  });
});

describe("readClaudeCodeUsage", () => {
  it("uses the file's modification time as the capture time", async () => {
    const file = join(dir, "usage.json");
    writeFileSync(file, JSON.stringify({ five_hour: { used_percentage: 7, resets_at: 1738425600 } }));
    const t = new Date("2026-11-02T12:00:00Z");
    utimesSync(file, t, t);
    const u = await readClaudeCodeUsage(file);
    expect(u?.fetchedAt).toBe(t.getTime());
    expect(u?.fiveHour?.utilization).toBe(7);
  });
  it("returns null for a missing or broken file", async () => {
    expect(await readClaudeCodeUsage(join(dir, "missing.json"))).toBeNull();
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{");
    expect(await readClaudeCodeUsage(bad)).toBeNull();
  });
});
