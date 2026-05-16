import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Asserts that each bundled `skills/<name>/SKILL.md` body matches the
 * upstream copy captured in `tests/fixtures/upstream/<name>.md`. Fixtures
 * are refreshed by `npm run sync-skills`; tests stay offline.
 *
 * Frontmatter is intentionally NOT compared — local files retain
 * Raycast-specific metadata (`tools_used`, `read_only`, `upstream`,
 * `upstream_sha`) that upstream doesn't declare. Only the body is the
 * canonical content from `superhuman/mcp-mail`.
 */

const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const FIXTURES_DIR = join(ROOT, "tests", "fixtures", "upstream");

function bodyOf(raw: string): string {
  const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return (m ? m[1] : raw).trim();
}

const skillNames = readdirSync(SKILLS_DIR).filter((entry) => {
  try {
    return statSync(join(SKILLS_DIR, entry)).isDirectory();
  } catch {
    return false;
  }
});

describe("bundled skill bodies match upstream fixtures", () => {
  it("fixtures directory is populated", () => {
    expect(existsSync(FIXTURES_DIR)).toBe(true);
    const fixtureCount = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".md")).length;
    expect(fixtureCount).toBeGreaterThan(0);
  });

  for (const name of skillNames) {
    it(`${name}: body matches tests/fixtures/upstream/${name}.md`, () => {
      const bundledPath = join(SKILLS_DIR, name, "SKILL.md");
      const fixturePath = join(FIXTURES_DIR, `${name}.md`);
      expect(existsSync(bundledPath), `bundled SKILL.md for ${name}`).toBe(true);
      expect(existsSync(fixturePath), `fixture for ${name} (refresh with npm run sync-skills)`).toBe(true);

      const bundledBody = bodyOf(readFileSync(bundledPath, "utf8"));
      const fixtureBody = bodyOf(readFileSync(fixturePath, "utf8"));
      expect(bundledBody, `${name} body should match upstream`).toBe(fixtureBody);
    });
  }
});
