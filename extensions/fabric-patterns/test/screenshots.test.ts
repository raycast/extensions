import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkScreenshots } from "../scripts/check-screenshots";

// Real PNGs, resized by sips from the extension icon, so the checker reads what sips reads.
let base: string;
const shots: Record<string, string> = {};

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), "fabric-raycast-shots-"));
  const icon = join(import.meta.dir, "..", "assets", "command-icon.png");
  const shot = (name: string, w: number, h: number) => {
    shots[name] = join(base, `${name}.png`);
    execFileSync("sips", ["-z", String(h), String(w), icon, "--out", shots[name]], { stdio: "pipe" });
  };
  shot("good", 2000, 1250);
  shot("narrow", 1999, 1250);
  shot("short", 2000, 1249);
});

afterAll(() => rmSync(base, { recursive: true, force: true }));

let n = 0;
/** `pngs` good screenshots, plus `extra` files: a fixture's name copies it, anything else is the file's text. */
function folder(pngs: number, extra: Record<string, string> = {}): string {
  const dir = join(base, `case-${n++}`);
  mkdirSync(dir);
  for (let i = 1; i <= pngs; i++) copyFileSync(shots.good, join(dir, `fabric-patterns-${i}.png`));
  for (const [name, what] of Object.entries(extra)) {
    if (what in shots) copyFileSync(shots[what], join(dir, name));
    else writeFileSync(join(dir, name), what);
  }
  return dir;
}

describe("ISC-97: metadata/ holds 3–6 PNGs at exactly 2000×1250", () => {
  test.each([3, 6])("%i good PNGs pass", (count) => {
    expect(checkScreenshots(folder(count))).toEqual([]);
  });

  test.each([0, 2, 7])("%i PNGs fail on the count", (count) => {
    expect(checkScreenshots(folder(count)).join("\n")).toContain("3–6");
  });

  test("a PNG one pixel too narrow fails, naming the file and its size", () => {
    expect(checkScreenshots(folder(3, { "narrow.png": "narrow" }))).toEqual(["narrow.png is 1999×1250, not 2000×1250"]);
  });

  test("a PNG one pixel too short fails", () => {
    expect(checkScreenshots(folder(3, { "short.png": "short" }))).toEqual(["short.png is 2000×1249, not 2000×1250"]);
  });

  test("a .png that isn't an image fails", () => {
    expect(checkScreenshots(folder(3, { "fake.png": "not a png" }))).toEqual(["fake.png: sips read no size"]);
  });

  test("a file that isn't a PNG fails; dotfiles are ignored", () => {
    expect(checkScreenshots(folder(3, { "shot.jpg": "x", ".DS_Store": "x" }))).toEqual(["shot.jpg is not a .png"]);
  });

  test("an uppercase .PNG counts as a PNG", () => {
    expect(checkScreenshots(folder(2, { "shot.PNG": "good" }))).toEqual([]);
  });

  // This command runs by hand before a Store release, so its exit code is the gate.
  const cli = (dir: string) =>
    spawnSync("bun", [join(import.meta.dir, "..", "scripts", "check-screenshots.ts"), dir], { encoding: "utf8" });

  test("the command exits 1 on a bad folder and prints no count", () => {
    const r = cli(folder(3, { "narrow.png": "narrow" }));
    expect([r.status, r.stdout, r.stderr.trim()]).toEqual([1, "", "narrow.png is 1999×1250, not 2000×1250"]);
  });

  test("the command exits 0 on a good folder and prints the count", () => {
    const dir = folder(3);
    const r = cli(dir);
    expect([r.status, r.stdout]).toEqual([0, `3 screenshots at 2000×1250 in ${dir}\n`]);
  });

  test("a missing folder fails", () => {
    expect(checkScreenshots(join(base, "nope"))).toEqual([`no folder at ${join(base, "nope")}`]);
  });
});
