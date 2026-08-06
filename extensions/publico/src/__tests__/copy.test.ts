import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Vitest runs from the project root, and `__dirname` is not reliable under
// its ESM transform, so resolve from cwd instead.
const ROOT = process.cwd();
// Written as an escape, not the literal glyph, so this guard file does not
// trip its own detector.
const EM_DASH = "\u2014";

function filesToScan(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|json|mjs)$/.test(entry.name)) out.push(full);
    }
  };
  walk(join(ROOT, "src"));
  out.push(join(ROOT, "scripts", "generate-sections.mjs"));
  out.push(join(ROOT, "package.json"));
  return out;
}

describe("command titles", () => {
  it("leads every command title with a verb", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { commands: Array<{ name: string; title: string }> };
    const offenders = pkg.commands
      .filter((c) => !/^(Browse|Search) /.test(c.title))
      .map((c) => `${c.name}: ${c.title}`);
    expect(offenders).toEqual([]);
  });

  it("does not leak the verb prefix into section copy", () => {
    // `Browse` belongs to the command title only. The bare section name is
    // what gets interpolated into placeholders and error toasts.
    const offenders = readdirSync(join(ROOT, "src"))
      .filter((f) => f.startsWith("section-") && f.endsWith(".tsx"))
      .filter((f) =>
        /(?:Placeholder|errorToastTitle|emptyTitle)="[^"]*Browse /.test(
          readFileSync(join(ROOT, "src", f), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});

describe("copy conventions", () => {
  it("uses no em-dash anywhere in source, manifest, or the generator", () => {
    const offenders = filesToScan().filter((f) =>
      readFileSync(f, "utf8").includes(EM_DASH),
    );
    expect(offenders.map((f) => f.replace(ROOT + "/", ""))).toEqual([]);
  });

  it("uses no curly quotes in source", () => {
    const offenders = filesToScan()
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      // Escapes, not literal curly quotes, for the same self-detection reason.
      .filter((f) => /[\u201c\u201d]/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.replace(ROOT + "/", ""))).toEqual([]);
  });

  it("uses no three-dot ellipsis in user-facing strings", () => {
    const offenders = filesToScan()
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /Placeholder="[^"]*\.\.\./.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.replace(ROOT + "/", ""))).toEqual([]);
  });

  it("never says trending or top news for the popular concept", () => {
    const text = readFileSync(
      join(ROOT, "src", "view-popular-news.tsx"),
      "utf8",
    );
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/top news/i);
  });
});
