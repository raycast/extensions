import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/history.json";
import { averageUsed, parseHistory, readHistory } from "../../src/lib/history";

const PROFILE = "00000000-0000-0000-0000-000000000001";

describe("parseHistory", () => {
  const entries = parseHistory(fixture);

  it("keeps one entry per reset, newest first", () => {
    expect(entries.map((e) => e.id.slice(-1))).toEqual(["c", "b", "a"]);
    expect(entries.map((e) => e.kind)).toEqual(["session", "weekly", "session"]);
  });

  it("reads how much was used when the window reset", () => {
    expect(entries.map((e) => e.usedPercent)).toEqual([20, 81, 64]);
    expect(entries[1].at.toISOString()).toBe("2026-11-10T15:31:40.100Z");
  });

  it("lists only the models that were used in a week", () => {
    expect(entries[1].models).toEqual([{ title: "Sonnet", usedPercent: 12 }]);
    expect(entries[0].models).toEqual([]);
  });

  it("ignores unknown reset types, incomplete entries and unexpected files", () => {
    expect(entries).toHaveLength(3);
    expect(parseHistory({})).toEqual([]);
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory({ snapshots: [null, 3] })).toEqual([]);
  });

  it("averages the share used", () => {
    expect(averageUsed(entries.filter((e) => e.kind === "session"))).toBe(42);
    expect(averageUsed([])).toBeUndefined();
  });
});

describe("readHistory", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "claude-usage-history-"));
    writeFileSync(join(dir, `usageHistory_${PROFILE}.json`), JSON.stringify(fixture));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("reads the file of the given profile", async () => {
    expect(await readHistory(PROFILE, dir)).toHaveLength(3);
  });

  it("returns nothing for a profile without history or without a folder", async () => {
    expect(await readHistory("00000000-0000-0000-0000-000000000009", dir)).toEqual([]);
    expect(await readHistory(PROFILE, null)).toEqual([]);
  });

  it("refuses ids that are not plain identifiers", async () => {
    expect(await readHistory(`../usageHistory_${PROFILE}`, dir)).toEqual([]);
  });

  it("reports a corrupt file instead of showing an empty history", async () => {
    writeFileSync(join(dir, "usageHistory_00000000-0000-0000-0000-00000000000f.json"), "{not json");
    await expect(readHistory("00000000-0000-0000-0000-00000000000f", dir)).rejects.toThrow();
  });
});
