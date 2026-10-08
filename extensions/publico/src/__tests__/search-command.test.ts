import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const manifest = () =>
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    commands: Array<{
      name: string;
      title: string;
      keywords?: string[];
      description: string;
    }>;
  };
const searchCommand = () =>
  manifest().commands.find((c) => c.name === "search-news");

describe("the topic command", () => {
  it("keeps the id, so existing hotkeys and aliases survive", () => {
    expect(searchCommand()).toBeDefined();
  });

  it("is titled for what it does, not for full-text search", () => {
    expect(searchCommand()?.title).toBe("Browse Topic");
  });

  it("stays findable by the words people actually type", () => {
    // Raycast matches a multi-word query as a phrase, not as separate
    // keyword hits, so the old title has to be present verbatim or anyone
    // typing "search news" finds nothing.
    const keywords = searchCommand()?.keywords ?? [];
    for (const expected of ["search news", "search", "news", "pesquisa"]) {
      expect(keywords).toContain(expected);
    }
  });
});

describe("the search fallback", () => {
  const source = () =>
    readFileSync(join(ROOT, "src", "search-news.tsx"), "utf8");

  it("offers Publico's own search when no topic matches", () => {
    expect(source()).toContain("publico.pt/pesquisa?query=");
  });

  it("percent-encodes the query", () => {
    // Real queries contain spaces and accents, such as "guerra na ucrania"
    // and "preco da habitacao". An unencoded URL would break them.
    expect(source()).toMatch(/encodeURIComponent\(\s*searchText/);
  });

  it("does not offer a blank search before anything is typed", () => {
    // The initial prompt has no query yet, so a fallback there would open an
    // empty search page.
    const text = source();
    const initial = text.indexOf('title="Browse Público topics"');
    expect(initial).toBeGreaterThan(-1);
    const block = text.slice(initial, initial + 400);
    expect(block).not.toContain("pesquisa?query=");
  });
});

describe("keyword coverage", () => {
  it("gives every command at least one keyword", () => {
    // Titles are English; keywords are how a Portuguese reader finds a
    // command. A command shipping with none is invisible to half its
    // audience, and nothing on screen reveals it.
    const bare = manifest()
      .commands.filter((c) => (c.keywords ?? []).length === 0)
      .map((c) => c.name);
    expect(bare).toEqual([]);
  });
});

describe("keyword accents", () => {
  it("pairs every accented keyword with an accent-free twin", () => {
    // Portuguese readers routinely type without accents. A keyword of
    // "saúde" with no "saude" is invisible to half of them, and nothing on
    // screen reveals it.
    const strip = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const gaps: string[] = [];
    for (const command of manifest().commands) {
      const keywords = command.keywords ?? [];
      for (const keyword of keywords) {
        const bare = strip(keyword);
        if (bare !== keyword && !keywords.includes(bare)) {
          gaps.push(`${command.name}: ${keyword} has no ${bare}`);
        }
      }
    }
    expect(gaps).toEqual([]);
  });
});
