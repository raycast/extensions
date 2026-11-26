/**
 * The vendored copies are the CLI's code, not a fork of it.
 *
 * Next to its sources every file under src/vendor must be byte-identical to
 * the original. That is the RedBison main repo (integrations/raycast, two
 * folders up) or the open-source redbison-tools repo (raycast/, one folder
 * up, beside cli/ and ide/). Only the main repo has public/ai-tools.json, so
 * the catalogue check runs there alone. When either drifts, `npm run sync`
 * fixes it. Inside raycast/extensions neither layout exists and these checks
 * skip; the committed copies are what ships there.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const EXT = resolve(__dirname, "..");
const VENDOR = join(EXT, "src/vendor");
const isSourceRoot = (dir: string) =>
  existsSync(join(dir, "cli/src/catalog.ts")) && existsSync(join(dir, "ide/vscode/src/local.ts"));
// Same search as scripts/sync.mjs: main repo first, then redbison-tools.
const ROOT = [resolve(EXT, "../.."), resolve(EXT, "..")].find(isSourceRoot) ?? "";
const SITE_JSON = ROOT ? join(ROOT, "public/ai-tools.json") : "";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

const GENERATED = new Set(["README.md", "site-tools.json", "cli/src/binary.ts"]);

describe.skipIf(!ROOT)("vendored code matches the RedBison repo", () => {
  const files = listFiles(VENDOR).map((f) => relative(VENDOR, f).split("\\").join("/"));

  it("copies files unchanged", () => {
    const drifted = files
      .filter((f) => !GENERATED.has(f))
      .filter((f) => readFileSync(join(VENDOR, f), "utf8") !== readFileSync(join(ROOT, f), "utf8"));
    expect(drifted, "run npm run sync").toEqual([]);
  });

  it("keeps the CLI's set of file-based tools", () => {
    const source = readFileSync(join(ROOT, "cli/src/binary.ts"), "utf8");
    const line = source.split("\n").find((l) => l.startsWith("export const BINARY_TOOLS"));
    expect(readFileSync(join(VENDOR, "cli/src/binary.ts"), "utf8")).toContain(line);
  });

  it("keeps the shared case table current", () => {
    expect(readFileSync(join(EXT, "test/fixtures/test-cases.json"), "utf8")).toBe(
      readFileSync(join(ROOT, "ide/test-cases.json"), "utf8"),
    );
  });

  it.skipIf(!existsSync(SITE_JSON))("bundles the site catalogue the site publishes", () => {
    const site = JSON.parse(readFileSync(SITE_JSON, "utf8")) as { tools: { id: string }[] };
    const bundled = JSON.parse(readFileSync(join(VENDOR, "site-tools.json"), "utf8")) as { tools: { id: string }[] };
    expect(bundled.tools.map((t) => t.id)).toEqual(site.tools.map((t) => t.id));
  });
});
