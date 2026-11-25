import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { brewInstalledDate, brewInstalledVersion, brewInstallPath } from "./helpers";
import type { Formula } from "../types";

// `rust` on Homebrew 7.0.16 with two kegs: 1.99.1 left behind by an upgrade
// and 1.100.0, which brew links and uses. The row read `installed[0]`, the
// superseded keg, while the sidebar read the linked one.
const rust = {
  name: "rust",
  versions: { stable: "1.100.0", bottle: true },
  linked_keg: "1.100.0",
  pinned: false,
  outdated: false,
  installed: [
    { version: "1.99.1", installed_on_request: false, time: 1_792_400_000 },
    { version: "1.100.0", installed_on_request: false, time: 1_795_000_000 },
  ],
} as unknown as Formula;

describe("row version and date with two kegs", () => {
  it("shows the keg brew uses, not the superseded one", () => {
    expect(brewInstalledVersion(rust)).toBe("1.100.0");
  });

  it("dates the row by that keg's install", () => {
    expect(brewInstalledDate(rust)?.getTime()).toBe(1_795_000_000 * 1000);
  });
});

describe("install path with two kegs", () => {
  it("points at the keg brew uses", () => {
    expect(brewInstallPath(rust)).toMatch(/\/Cellar\/rust\/1\.100\.0$/);
  });
});

// The same bug has shipped more than once: `installed` is ordered OLDEST
// first, so `installed[0]` names a keg brew no longer uses whenever an upgrade
// left the old one behind. Every read of "the installed version" goes through
// `effectiveKeg` (or `brewInstalledVersion`). This fails on any new direct read.
describe("no direct read of the oldest keg", () => {
  it("finds no installed[0] or installed.first() outside comments", () => {
    const root = join(__dirname, "..", "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          readFileSync(path, "utf8")
            .split("\n")
            .forEach((line, i) => {
              if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
              const code = line.replace(/\s\/\/.*$/, "");
              if (/\binstalled\s*(\?\.)?\[\s*0\s*\]|\binstalled\s*\??\.\s*first\(\)/.test(code))
                offenders.push(`${path}:${i + 1}`);
            });
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
