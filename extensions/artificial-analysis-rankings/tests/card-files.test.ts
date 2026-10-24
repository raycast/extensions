import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CARD_MAX_AGE_MS, pruneStaleFiles } from "../src/lib/card-files";

describe("generated card cleanup", () => {
  let directory: string | undefined;
  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it("removes only cards unused for longer than the limit", () => {
    directory = mkdtempSync(path.join(tmpdir(), "cards-"));
    const now = Date.now();
    const write = (name: string, ageMs: number) => {
      const file = path.join(directory!, name);
      writeFileSync(file, "<svg/>");
      const time = new Date(now - ageMs);
      utimesSync(file, time, time);
    };
    write("old.svg", CARD_MAX_AGE_MS + 60_000);
    write("recent.svg", CARD_MAX_AGE_MS - 60_000);
    write("new.svg", 0);
    expect(pruneStaleFiles(directory, CARD_MAX_AGE_MS, now)).toBe(1);
    expect(readdirSync(directory).sort()).toEqual(["new.svg", "recent.svg"]);
  });
});
