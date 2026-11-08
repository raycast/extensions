import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { SnapshotNotFoundError, findSnapshotPath, parseSnapshot, readSnapshot } from "../../src/lib/snapshot";
import fixture from "../fixtures/widget-snapshot.json";

const dirs: string[] = [];
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "codexbar-snapshot-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("parseSnapshot", () => {
  const [codex, claude] = parseSnapshot(fixture);

  it("reads one entry per provider", () => {
    expect(codex.name).toBe("Codex");
    expect(claude.name).toBe("Claude");
    expect(claude.source).toBe("app");
  });

  it("fills rows without an inline window from the standard windows", () => {
    expect(claude.windows.map((w) => [w.id, w.title, w.usedPercent])).toEqual([
      ["primary", "5-Hour Session", 40],
      ["secondary", "Weekly", 2],
      ["claude-weekly-scoped-model", "Opus only", 1],
    ]);
    expect(claude.windows[1].resetsAt?.toISOString()).toBe("2026-11-14T07:00:00.000Z");
    expect(claude.windows[1].windowMinutes).toBe(10080);
  });

  it("replaces localized period titles but keeps model-scoped ones", () => {
    const [entry] = parseSnapshot({
      entries: [
        {
          provider: "codex",
          usageRows: [
            { id: "monthly", title: "Mensile", percentLeft: 100, window: { usedPercent: 0, windowMinutes: 43200 } },
            { id: "scoped", title: "Modello X", percentLeft: 90, window: { usedPercent: 10, windowMinutes: 43200 } },
          ],
        },
      ],
    });
    expect(entry.windows.map((w) => w.title)).toEqual(["Monthly", "Modello X"]);
  });

  it("keeps cost totals", () => {
    expect(claude).toMatchObject({ todayCost: 4.25, todayTokens: 1_200_000, last30DaysCost: 120.5, currency: "USD" });
    expect(codex.todayCost).toBeUndefined();
  });

  it("falls back to percentLeft when no window is available", () => {
    const [entry] = parseSnapshot({
      entries: [{ provider: "x", usageRows: [{ id: "custom", title: "Credits", percentLeft: 25 }] }],
    });
    expect(entry.windows).toEqual([
      { id: "custom", title: "Credits", usedPercent: 75, resetsAt: undefined, windowMinutes: undefined },
    ]);
  });

  it("uses standard windows when there are no rows", () => {
    const [entry] = parseSnapshot({
      entries: [{ provider: "claude", primary: { usedPercent: 10, windowMinutes: 300 }, secondary: null }],
    });
    expect(entry.windows.map((w) => w.title)).toEqual(["5-Hour Session"]);
  });

  it("tolerates an empty snapshot", () => {
    expect(parseSnapshot({})).toEqual([]);
  });
});

describe("findSnapshotPath / readSnapshot", () => {
  it("finds the snapshot inside the team-prefixed group container", async () => {
    const root = tempDir();
    mkdirSync(join(root, "ABCDE12345.com.other.app"));
    const container = join(root, "ABCDE12345.com.steipete.codexbar");
    mkdirSync(container);
    writeFileSync(join(container, "widget-snapshot.json"), JSON.stringify(fixture));
    const path = findSnapshotPath(root);
    expect(path).toBe(join(container, "widget-snapshot.json"));
    const data = await readSnapshot(path);
    expect(data.providers.map((entry) => entry.provider)).toEqual(["codex", "claude"]);
    expect(data.enabledProviders).toEqual(["codex", "claude", "gemini"]);
  });

  it("returns undefined when nothing is there", () => {
    const root = tempDir();
    mkdirSync(join(root, "ABCDE12345.com.steipete.codexbar"));
    expect(findSnapshotPath(root)).toBeUndefined();
    expect(findSnapshotPath(join(root, "missing"))).toBeUndefined();
  });

  it("throws a typed error when the snapshot is missing", async () => {
    await expect(readSnapshot(null)).rejects.toBeInstanceOf(SnapshotNotFoundError);
    await expect(readSnapshot(join(tempDir(), "nope.json"))).rejects.toBeInstanceOf(SnapshotNotFoundError);
  });
});
