import { describe, expect, it } from "vitest";
import { BUNDLED_TOOLS, categoriesOf, isSiteUrl, parseCatalogue, searchKeywords } from "../src/lib/site-tools";

describe("bundled catalogue", () => {
  it("lists every site tool once, each with a redbison.dev link", () => {
    expect(BUNDLED_TOOLS.length).toBeGreaterThan(700);
    expect(new Set(BUNDLED_TOOLS.map((t) => t.id)).size).toBe(BUNDLED_TOOLS.length);
    for (const t of BUNDLED_TOOLS) {
      expect(isSiteUrl(t.url), t.id).toBe(true);
      expect(t.name.length, t.id).toBeGreaterThan(0);
      expect(t.category.length, t.id).toBeGreaterThan(0);
    }
  });

  it("passes its own validation, so the live list can replace it like for like", () => {
    expect(parseCatalogue({ tools: BUNDLED_TOOLS })).toEqual(BUNDLED_TOOLS);
  });

  it("orders categories by size", () => {
    const cats = categoriesOf(BUNDLED_TOOLS);
    const count = (c: string) => BUNDLED_TOOLS.filter((t) => t.category === c).length;
    for (let i = 1; i < cats.length; i++) expect(count(cats[i - 1])).toBeGreaterThanOrEqual(count(cats[i]));
  });
});

describe("live catalogue", () => {
  const good = {
    id: "json-beautify",
    name: "JSON Beautifier",
    description: "Format JSON.",
    url: "https://redbison.dev/json-beautify",
    category: "Tech Tools",
    subcategory: "Data Formats",
    guide: "https://redbison.dev/blog/json",
    keywords: ["json", 3],
  };

  it("keeps well-formed entries and drops stray keyword types", () => {
    const [t] = parseCatalogue({ tools: [good] });
    expect(t.keywords).toEqual(["json"]);
    expect(t.guide).toBe("https://redbison.dev/blog/json");
  });

  it("drops entries that would open anything but redbison.dev", () => {
    const tools = parseCatalogue({
      tools: [
        good,
        { ...good, id: "evil", url: "https://redbison.dev.example.com/x" },
        { ...good, id: "http", url: "http://redbison.dev/x" },
        { ...good, id: "js", url: "javascript:alert(1)" },
        { ...good, id: "guide", guide: "https://example.com/" },
      ],
    });
    expect(tools.map((t) => t.id)).toEqual(["json-beautify", "guide"]);
    expect(tools[1].guide).toBeUndefined();
  });

  it("refuses a reply that is not a catalogue", () => {
    expect(() => parseCatalogue(null)).toThrow();
    expect(() => parseCatalogue({ tools: "x" })).toThrow();
    expect(() => parseCatalogue({ tools: [] })).toThrow();
  });

  it("searches by keyword, subcategory and id", () => {
    const kw = searchKeywords(parseCatalogue({ tools: [good] })[0]);
    expect(kw).toEqual(expect.arrayContaining(["json", "data", "formats", "json-beautify"]));
  });
});
