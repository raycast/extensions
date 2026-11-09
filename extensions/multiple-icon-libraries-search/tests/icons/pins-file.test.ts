import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adoptPins,
  mergeLegacyPins,
  pinsPath,
  readPins,
  readPinsFile,
  updatePins,
  watchPins,
} from "../../src/icons/pins-file";
import { toggleFavorite } from "../../src/icons/stores";

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pins-"));
  path = pinsPath(dir);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("pins file", () => {
  it("lives in the support folder", () => {
    expect(path).toBe(join(dir, "pins.json"));
  });

  it("reads a missing, broken, or wrongly shaped file as no pins", () => {
    expect(readPinsFile(path)).toEqual({});
    writeFileSync(path, "{not json");
    expect(readPins(path, "lucide")).toEqual([]);
    writeFileSync(path, "[1, 2]");
    expect(readPinsFile(path)).toEqual({});
    writeFileSync(path, "null");
    expect(readPinsFile(path)).toEqual({});
  });

  it("keeps only names, once each, in order", () => {
    writeFileSync(path, JSON.stringify({ lucide: ["x", 3, "", "check", "x"], hugeicons: "tick-02" }));
    expect(readPins(path, "lucide")).toEqual(["x", "check"]);
    expect(readPins(path, "hugeicons")).toEqual([]);
  });

  it("updates one library from what is on disk now, leaving the others", () => {
    writeFileSync(path, JSON.stringify({ lucide: ["x"], hugeicons: ["tick-02"] }));
    // Another tool adds a pin while the command is open with an older list in memory.
    writeFileSync(path, JSON.stringify({ lucide: ["x", "check"], hugeicons: ["tick-02"] }));
    const next = updatePins(path, "lucide", (pins) => toggleFavorite(pins, "zap"));
    expect(next).toEqual(["x", "check", "zap"]);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ lucide: ["x", "check", "zap"], hugeicons: ["tick-02"] });
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  it("creates the file on the first pin", () => {
    expect(updatePins(path, "hugeicons", () => ["pin", "pin"])).toEqual(["pin"]);
    expect(readPinsFile(path)).toEqual({ hugeicons: ["pin"] });
  });

  it("puts old LocalStorage pins first, without repeats", () => {
    expect(mergeLegacyPins(["a", "b", "a"], ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(mergeLegacyPins([], ["c"])).toEqual(["c"]);
  });

  it("creates the file and moves in every library's old pins", () => {
    expect(adoptPins(path, {})).toEqual({});
    expect(readPinsFile(path)).toEqual({});
    writeFileSync(path, JSON.stringify({ lucide: ["check"], raycast: ["pin"] }));
    adoptPins(path, { lucide: ["x", "check"], hugeicons: ["tick-02"] });
    expect(readPinsFile(path)).toEqual({ lucide: ["x", "check"], hugeicons: ["tick-02"], raycast: ["pin"] });
  });

  it("notices when another tool replaces the file, until stopped", async () => {
    writeFileSync(path, JSON.stringify({ lucide: [] }));
    let calls = 0;
    const stop = watchPins(path, () => calls++, 20);
    await new Promise((resolve) => setTimeout(resolve, 60));
    writeFileSync(`${path}.tmp`, JSON.stringify({ lucide: ["x"] }));
    // Renaming a copy over the file, as the other tools do.
    const { renameSync, utimesSync } = await import("node:fs");
    renameSync(`${path}.tmp`, path);
    utimesSync(path, new Date(), new Date(Date.now() + 5000));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(calls).toBeGreaterThan(0);
    stop();
    const seen = calls;
    utimesSync(path, new Date(), new Date(Date.now() + 10000));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(calls).toBe(seen);
  });
});
