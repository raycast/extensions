import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));

type Deps = Record<string, string>;
const pkg = read("package.json") as { name: string; dependencies?: Deps; devDependencies?: Deps };
const lock = read("package-lock.json") as {
  name: string;
  lockfileVersion: number;
  packages: Record<string, { name?: string; dependencies?: Deps; devDependencies?: Deps; version?: string }>;
};

describe("ISC-94: package-lock.json matches package.json", () => {
  // The Store installs with `npm ci`. Its dry run on a copy checks that the lock satisfies package.json's
  // ranges and the tree is whole; it does not check `integrity` or `resolved` (probed 2026-10-20), and it
  // installs and runs nothing. A matching pair needs no cache; a stale one fails ETARGET or ENOTCACHED.
  test("npm ci accepts the pair", () => {
    const dir = mkdtempSync(join(tmpdir(), "fabric-raycast-npmci-"));
    try {
      for (const f of ["package.json", "package-lock.json"]) copyFileSync(join(root, f), join(dir, f));
      const r = spawnSync("npm", ["ci", "--dry-run", "--ignore-scripts", "--offline"], { cwd: dir, encoding: "utf8" });
      expect(r.status === 0 ? "ok" : `npm ci exited ${r.status}: ${r.stderr.slice(-600)}`).toBe("ok");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Faster and more precise than npm ci's message for the common slip: a dependency edited in one file only.
  for (const key of ["dependencies", "devDependencies"] as const) {
    test(`root ${key} equal package.json's, name for name and range for range`, () => {
      const want = pkg[key] ?? {};
      expect(Object.keys(want).length).toBeGreaterThan(0);
      expect(lock.packages[""][key] ?? {}).toEqual(want);
    });
  }

  // Cosmetic: npm ci accepts a stale name (probed), but a lockfile naming another package misleads a reader.
  test("the lockfile carries package.json's name, at the top and on the root package", () => {
    expect([lock.name, lock.packages[""].name]).toEqual([pkg.name, pkg.name]);
  });
});

// The cause is fixed and pinned in runner.test.ts (HOME survives); the ignore keeps a stray copy out of commits.
describe("ISC-95: fabric's stray folders stay out of commits", () => {
  for (const dir of ["fabric", ".config"]) {
    test(`${dir}/ is ignored by the repo's own .gitignore`, () => {
      // -v names the rule's source, so a global excludes file can't satisfy this. Exit 1 throws.
      const out = execFileSync("git", ["check-ignore", "-v", `${dir}/locales/x`], { cwd: root, encoding: "utf8" });
      expect(out).toMatch(new RegExp(`^\\.gitignore:\\d+:/${dir.replace(".", "\\.")}/\\t${dir}/locales/x\\n$`));
    });

    // The ignore hides a regrowth from git status, so this is what notices one.
    test(`${dir}/ is not in the repo root`, () => {
      expect(existsSync(join(root, dir))).toBe(false);
    });
  }

  test("the ignore is no wider than the two root folders", () => {
    const r = spawnSync("git", ["check-ignore", "src/fabric-new.tsx", "assets/fabric-x.sh", "test/.config/x"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(r.status === 1 ? "none ignored" : `ignored: ${r.stdout}`).toBe("none ignored");
  });
});
