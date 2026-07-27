import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { parseIconModule } from "./parse-icon-module";
// @ts-expect-error — the build script is untyped ESM; that's the point of the check.
import { parseIconModule as parseWithBuildScript } from "../../scripts/parse-central-icons.mjs";

/**
 * Two parsers exist and must not drift.
 *
 * `parse-icon-module.ts` runs inside the extension and backs every runtime
 * install; `scripts/parse-central-icons.mjs` backs `npm run build:icons`. If
 * they diverge, a Store user and a developer get different geometry from the
 * same upstream package — silently, because both still produce valid SVG.
 *
 * The fixtures are **synthetic**, not Central Icon System artwork: the set is
 * commercial and its licence forbids publishing the icons or their parts, so
 * real modules cannot be committed here. They reproduce the module *structure*
 * upstream ships and each isolates one construct the parser has to survive.
 * See `__fixtures__/icon-modules/README.md`.
 *
 * An earlier version of this file pointed at an extracted package under a
 * machine-specific temp path and returned early when it was absent — which was
 * always, for everyone but the machine that wrote it. It reported green having
 * asserted nothing. Fixtures are committed precisely so this cannot recur.
 */
const FIXTURES = join(__dirname, "__fixtures__", "icon-modules");

const fixtures = readdirSync(FIXTURES)
  .filter((n) => n.endsWith(".mjs"))
  .sort();

describe("parser parity", () => {
  it("has fixtures to check", () => {
    // Guards the guard: a rename or a bad glob would otherwise turn this whole
    // suite into a no-op that still passes.
    expect(fixtures.length).toBeGreaterThanOrEqual(7);
  });

  it.each(fixtures)("%s — both parsers emit identical SVG", (file) => {
    const source = readFileSync(join(FIXTURES, file), "utf8");
    const name = basename(file, ".mjs");

    const runtime = parseIconModule(source, { name });
    const build = parseWithBuildScript(source, { name });

    expect(runtime.svg).toBe(build.svg);
    expect(runtime.aliases).toEqual(build.aliases);

    // Parity between two broken parsers is still parity, so assert the output
    // is actually usable rather than merely equal.
    expect(runtime.svg).toMatch(/^<svg\b/);
    expect(runtime.svg).toContain('viewBox="0 0 24 24"');
    expect(runtime.svg.trimEnd()).toMatch(/<\/svg>$/);
  });

  it("preserves clipPath grouping rather than flattening it", () => {
    // The construct that defeated the original regex-based parser: a <g
    // clipPath> wrapping siblings, followed by a <defs> that declares the
    // referenced id. Flattening drops the clip and the icon renders unmasked.
    const source = readFileSync(join(FIXTURES, "clip-path-defs.mjs"), "utf8");
    const { svg } = parseIconModule(source, { name: "IconFixtureClipPath" });

    expect(svg).toContain('clip-path="url(#clip0_fixture)"');
    expect(svg).toContain("<defs>");
    expect(svg).toContain('<clipPath id="clip0_fixture">');
    // Both children stayed inside the group.
    expect(svg.match(/<path\b/g)).toHaveLength(2);
  });

  it("converts camelCase React props to kebab-case SVG attributes", () => {
    const source = readFileSync(join(FIXTURES, "fill-rule.mjs"), "utf8");
    const { svg } = parseIconModule(source, { name: "IconFixtureFillRule" });

    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('clip-rule="evenodd"');
    expect(svg).not.toContain("fillRule");
    expect(svg).not.toContain("clipRule");
  });

  it("reads aliases from ariaLabel, and tolerates its absence", () => {
    const withAliases = parseIconModule(readFileSync(join(FIXTURES, "plain-path.mjs"), "utf8"), {
      name: "IconFixturePlainPath",
    });
    expect(withAliases.aliases).toContain("plain path");

    const without = parseIconModule(readFileSync(join(FIXTURES, "no-aliases.mjs"), "utf8"), {
      name: "IconFixtureNoAliases",
    });
    expect(without.aliases).toEqual([]);
  });

  /**
   * Optional: run against a real extracted package when one is available.
   *
   * `CENTRAL_ICONS_PKG=/path/to/package npm test` checks all ~2,078 icons.
   * Absent, the fixtures above still assert real behavior — this only widens
   * coverage, it is not what keeps the suite honest. A path that is *set but
   * wrong* fails rather than skips, so a typo can't quietly disable it.
   */
  const pkg = process.env.CENTRAL_ICONS_PKG;
  const realPackage = pkg ? it : it.skip;

  realPackage("matches the build script across a real package", () => {
    if (!existsSync(pkg!)) throw new Error(`CENTRAL_ICONS_PKG is set to a path that does not exist: ${pkg}`);

    const names = readdirSync(pkg!).filter((n) => n.startsWith("Icon") && existsSync(join(pkg!, n, "index.mjs")));
    expect(names.length).toBeGreaterThan(2000);

    for (const name of names) {
      const source = readFileSync(join(pkg!, name, "index.mjs"), "utf8");
      expect(parseIconModule(source, { name }).svg).toBe(parseWithBuildScript(source, { name }).svg);
    }
  });
});
