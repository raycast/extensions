import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileBackend } from "../src/core/file-backend";
import { loadLocationsFile, updateLocationsFile } from "../src/core/store";
import type { Location } from "../src/core/types";

const seed: Location[] = [{ id: "tz:UTC", kind: "zone", label: "UTC", tz: "UTC", aliases: ["utc"] }];
const loc = (id: string): Location => ({ id, kind: "city", label: id, tz: "UTC", aliases: [] });

describe("file backend", () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "yatt-"));
    file = path.join(dir, "nested", "locations.json");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("seeds a missing file and updates it in place", async () => {
    const backend = fileBackend(file);
    expect((await loadLocationsFile(backend, seed)).locations).toHaveLength(1);
    const after = await updateLocationsFile(backend, seed, (f) => ({ locations: [...f.locations, loc("a")] }));
    expect(after.locations.map((l) => l.id)).toEqual(["tz:UTC", "a"]);
    expect(JSON.parse(readFileSync(file, "utf8")).locations).toHaveLength(2);
  });

  it("keeps changes from overlapping writers", async () => {
    const backend = fileBackend(file);
    await loadLocationsFile(backend, seed);
    // Two independent backends on the same file, like two Raycast commands: both add a location at once.
    const other = fileBackend(file);
    await Promise.all([
      updateLocationsFile(backend, seed, (f) => ({ locations: [...f.locations, loc("a")] })),
      updateLocationsFile(other, seed, (f) => ({ locations: [...f.locations, loc("b")] })),
    ]);
    const ids = JSON.parse(readFileSync(file, "utf8")).locations.map((l: Location) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["tz:UTC", "a", "b"]));
    expect(ids).toHaveLength(3);
  });

  it("treats an iCloud placeholder as not yet available, not as missing", async () => {
    const target = path.join(dir, "cloud.json");
    writeFileSync(path.join(dir, ".cloud.json.icloud"), "");
    const backend = fileBackend(target);
    await expect(loadLocationsFile(backend, seed)).rejects.toThrow(/iCloud/);
    await expect(updateLocationsFile(backend, seed, (f) => ({ locations: f.locations }))).rejects.toThrow(/iCloud/);
    expect(readFileSync(path.join(dir, ".cloud.json.icloud"), "utf8")).toBe("");
  });

  it("refuses to overwrite a damaged file", async () => {
    writeFileSync(path.join(dir, "damaged.json"), "{ nope");
    const backend = fileBackend(path.join(dir, "damaged.json"));
    await expect(updateLocationsFile(backend, seed, (f) => ({ locations: f.locations }))).rejects.toThrow(/not valid/);
    expect(readFileSync(path.join(dir, "damaged.json"), "utf8")).toBe("{ nope");
  });

  it("ignores an abandoned lock", async () => {
    const backend = fileBackend(file);
    await loadLocationsFile(backend, seed);
    writeFileSync(`${file}.lock`, "");
    const old = Date.now() / 1000 - 60;
    const { utimesSync } = await import("node:fs");
    utimesSync(`${file}.lock`, old, old);
    const after = await updateLocationsFile(backend, seed, (f) => ({ locations: [...f.locations, loc("a")] }));
    expect(after.locations).toHaveLength(2);
  });
});
