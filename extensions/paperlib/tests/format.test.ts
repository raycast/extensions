import { describe, expect, it } from "vitest";

import { citationKey, toBibTeX, toCitation } from "../src/lib/format";
import { DEMO_PAPERS } from "../src/lib/demo-library";
import { paperMarkdown } from "../src/lib/markdown";
import { normalizePapers } from "../src/lib/normalize";
import { mapPreferences } from "../src/lib/preferences";
import { buildPaperlibQuery, matchesLocalSearch } from "../src/lib/query";
import { parsePaperlibCsv } from "../src/lib/csv";

describe("query sentences", () => {
  it("matches Paperlib's general-mode LIKE filter", () => {
    expect(buildPaperlibQuery("attention is")).toBe(
      '(title LIKE[c] "*attention*is*" OR authors LIKE[c] "*attention*is*" OR publication LIKE[c] "*attention*is*" OR note LIKE[c] "*attention*is*" OR doi LIKE[c] "*attention*is*" OR arxiv LIKE[c] "*attention*is*")',
    );
  });

  it("returns an empty filter for an empty search", () => {
    expect(buildPaperlibQuery("  ")).toBe("");
    expect(buildPaperlibQuery("")).toBe("");
  });

  it("filters local records with AND-token matching", () => {
    expect(matchesLocalSearch(["Deep Residual Learning"], "residual deep")).toBe(true);
    expect(matchesLocalSearch(["Deep Residual Learning"], "gan")).toBe(false);
  });
});

describe("citations", () => {
  const transformer = DEMO_PAPERS[0];

  it("builds Paperlib-style citation keys", () => {
    expect(citationKey(transformer)).toBe("vaswani2017attention");
  });

  it("exports BibTeX with authors, year, and DOI", () => {
    const bibtex = toBibTeX(transformer);
    expect(bibtex).toContain("@inproceedings{vaswani2017attention,");
    expect(bibtex).toContain("author = {Vaswani, Ashish and Shazeer, Noam");
    expect(bibtex).toContain("year = {2017}");
    expect(bibtex).toContain("doi = {10.48550/arXiv.1706.03762}");
    expect(bibtex).toContain("archivePrefix = {arXiv}");
  });

  it("formats an APA citation with title, authors, and venue", () => {
    const citation = toCitation(transformer, "apa");
    expect(citation).toContain("Vaswani, A.");
    expect(citation).toContain("(2017).");
    expect(citation).toContain("Attention Is All You Need.");
    expect(citation).toContain("Advances in Neural Information Processing Systems");
  });
});

describe("normalize + csv + markdown", () => {
  it("reads Realm-style JSON including nested tags", () => {
    const [paper] = normalizePapers({
      data: [
        {
          _id: "1",
          title: "A Study",
          authors: "Jane Doe",
          doi: "https://doi.org/10.1/xyz",
          tags: [{ name: "ml" }],
        },
      ],
    });
    expect(paper.doi).toBe("10.1/xyz");
    expect(paper.tags).toEqual([{ name: "ml" }]);
  });

  it("parses Paperlib CSV exports", () => {
    const csv = `title,authors,doi,pubTime,publication,note\n"A Study","Jane Doe","10.1/xyz","2024","Nature","hello"\n`;
    const [paper] = parsePaperlibCsv(csv);
    expect(paper.title).toBe("A Study");
    expect(paper.doi).toBe("10.1/xyz");
    expect(paper.abstract).toBe("");
    expect(paper.note).toBe("hello");
  });

  it("renders title, authors, and abstract in the detail markdown", () => {
    const markdown = paperMarkdown(DEMO_PAPERS[0]);
    expect(markdown).toContain("# Attention Is All You Need");
    expect(markdown).toContain("**Authors:** Ashish Vaswani");
    expect(markdown).toContain("## Abstract");
    expect(markdown).toContain("Transformer architecture");
  });
});

describe("preferences", () => {
  it("applies defaults for a first-run install", () => {
    const mapped = mapPreferences({});
    expect(mapped.apiHost).toBe("http://127.0.0.1:21227");
    expect(mapped.useDemoFallback).toBe(true);
    expect(mapped.citationStyle).toBe("apa");
    expect(mapped.resultLimit).toBe(50);
  });
});
