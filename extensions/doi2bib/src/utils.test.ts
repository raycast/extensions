import { looksLikeDoi, relativeTime, addToHistory, HistoryEntry, extractDoi, formatBib } from "./utils";

describe("looksLikeDoi", () => {
  it("returns true for a typical DOI", () => {
    expect(looksLikeDoi("10.1177/20563051231193027")).toBe(true);
  });
  it("returns true for a DOI with full prefix", () => {
    expect(looksLikeDoi("https://doi.org/10.1038/nature12345")).toBe(true);
  });
  it("returns false for plain text with no slash", () => {
    expect(looksLikeDoi("hello world")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(looksLikeDoi("")).toBe(false);
  });
  it("returns false for whitespace only", () => {
    expect(looksLikeDoi("   ")).toBe(false);
  });
});

describe("relativeTime", () => {
  it("returns 'just now' for very recent timestamps", () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe("just now");
  });
  it("returns minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinutesAgo)).toBe("5 min ago");
  });
  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(twoHoursAgo)).toBe("2 hr ago");
  });
  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(threeDaysAgo)).toBe("3 days ago");
  });
  it("returns 'unknown' for an invalid date string", () => {
    expect(relativeTime("not-a-date")).toBe("unknown");
  });
  it("returns hours at exactly 60 minutes", () => {
    const exactly60MinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(relativeTime(exactly60MinAgo)).toBe("1 hr ago");
  });
  it("returns days at exactly 24 hours", () => {
    const exactly24HrAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(exactly24HrAgo)).toBe("1 day ago");
  });
});

describe("addToHistory", () => {
  const makeEntry = (doi: string, hoursAgo = 0): HistoryEntry => ({
    doi,
    bib: `@article{${doi}}`,
    fetchedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  });

  it("prepends new entry to empty history", () => {
    const result = addToHistory([], makeEntry("10.1/a"));
    expect(result).toHaveLength(1);
    expect(result[0].doi).toBe("10.1/a");
  });

  it("prepends new entry to existing history", () => {
    const history = [makeEntry("10.1/old")];
    const result = addToHistory(history, makeEntry("10.1/new"));
    expect(result[0].doi).toBe("10.1/new");
    expect(result[1].doi).toBe("10.1/old");
  });

  it("deduplicates: moves existing DOI to top with updated bib", () => {
    const history = [makeEntry("10.1/a"), makeEntry("10.1/b")];
    const updated = { doi: "10.1/b", bib: "@article{updated}", fetchedAt: new Date().toISOString() };
    const result = addToHistory(history, updated);
    expect(result[0].doi).toBe("10.1/b");
    expect(result[0].bib).toBe("@article{updated}");
    expect(result).toHaveLength(2);
  });

  it("caps history at 50 entries, dropping oldest", () => {
    const history = Array.from({ length: 50 }, (_, i) => makeEntry(`10.1/${i}`, 50 - i));
    const result = addToHistory(history, makeEntry("10.1/new"));
    expect(result).toHaveLength(50);
    expect(result[0].doi).toBe("10.1/new");
    expect(result[49].doi).toBe("10.1/1");
  });

  it("handles dedup and cap together: existing DOI in full 50-entry history", () => {
    const history = Array.from({ length: 50 }, (_, i) => makeEntry(`10.1/${i}`, 50 - i));
    const updated = { doi: "10.1/49", bib: "@article{refreshed}", fetchedAt: new Date().toISOString() };
    const result = addToHistory(history, updated);
    expect(result).toHaveLength(50);
    expect(result[0].doi).toBe("10.1/49");
    expect(result[0].bib).toBe("@article{refreshed}");
  });
});

describe("extractDoi", () => {
  it("strips https://doi.org/ prefix", () => {
    expect(extractDoi("https://doi.org/10.1038/nature12345")).toBe("10.1038/nature12345");
  });
  it("strips http://dx.doi.org/ prefix", () => {
    expect(extractDoi("http://dx.doi.org/10.1038/nature12345")).toBe("10.1038/nature12345");
  });
  it("returns bare DOI unchanged", () => {
    expect(extractDoi("10.1177/20563051231193027")).toBe("10.1177/20563051231193027");
  });
  it("trims whitespace", () => {
    expect(extractDoi("  10.1177/abc  ")).toBe("10.1177/abc");
  });
});

describe("formatBib", () => {
  it("formats single-line bibtex with proper indentation", () => {
    const input = "@article{abc,author={Smith, John},title={A Title}}";
    const result = formatBib(input);
    expect(result).toContain("@article{abc,\n");
    expect(result).toContain("  author={Smith, John},");
    expect(result).toContain("  title={A Title}");
  });

  it("normalizes already-indented bibtex", () => {
    const input = `@article{xyz,
      author = {Doe, Jane},
      title = {Another Title}
    }`;
    const result = formatBib(input);
    expect(result).toContain("@article{xyz,\n");
    expect(result).toContain("  author = {Doe, Jane},");
    expect(result).toContain("  title = {Another Title}");
  });

  it("handles fields with nested braces", () => {
    const input = "@article{test,author={Last, First},note={See also {Smith}}}";
    const result = formatBib(input);
    expect(result).toContain("  author={Last, First},");
    expect(result).toContain("  note={See also {Smith}}");
  });

  it("returns raw input if not parseable", () => {
    const input = "not a bibtex";
    expect(formatBib(input)).toBe(input);
  });

  it("removes trailing comma from last field", () => {
    const input = "@article{k,a={1},b={2},}";
    const result = formatBib(input);
    expect(result).not.toMatch(/,\s*\}/);
  });
});
