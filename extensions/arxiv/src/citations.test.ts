import {
  formatBibTeX,
  formatAPA,
  formatMLA,
  formatChicago,
  formatIEEE,
  formatACM,
  formatHarvard,
  formatTurabian,
  getCitation,
  CitationStyle,
} from "./citations";
import {
  mockSearchResult,
  mockSearchResultNoAuthors,
  mockSearchResultSingleAuthor,
  mockSearchResultTwoAuthors,
  mockSearchResultManyAuthors,
  mockSearchResultNoDOI,
  mockSearchResultNoJournal,
  mockSearchResultOldFormat,
  mockSearchResultSpecialChars,
} from "./test/fixtures";

describe("Citation Formatting", () => {
  describe("formatBibTeX", () => {
    it("should format a standard paper correctly", () => {
      const result = formatBibTeX(mockSearchResult);
      expect(result).toContain("@article{doe2023deep");
      expect(result).toContain("author = {John Doe and Jane Smith and Bob Johnson}");
      expect(result).toContain("title = {Deep Learning for Natural Language Processing: A Survey}");
      expect(result).toContain("year = {2023}");
      expect(result).toContain("eprint = {2301.12345}");
      expect(result).toContain("archivePrefix = {arXiv}");
      expect(result).toContain("primaryClass = {cs.CL}");
      expect(result).toContain("url = {https://arxiv.org/abs/2301.12345}");
      expect(result).toContain("doi = {10.1234/example.doi}");
      expect(result).toContain("journal = {Proceedings of ICML 2023}");
    });

    it("should handle papers without authors", () => {
      const result = formatBibTeX(mockSearchResultNoAuthors);
      expect(result).toContain("author = {Unknown}");
      expect(result).toContain("@article{unknown2023deep");
    });

    it("should handle papers without DOI", () => {
      const result = formatBibTeX(mockSearchResultNoDOI);
      expect(result).not.toContain("doi =");
    });

    it("should handle papers without journal reference", () => {
      const result = formatBibTeX(mockSearchResultNoJournal);
      expect(result).not.toContain("journal =");
    });

    it("should handle old format arXiv IDs", () => {
      const result = formatBibTeX(mockSearchResultOldFormat);
      expect(result).toContain("eprint = {math.GT/0605123}");
    });

    it("should escape special characters", () => {
      const result = formatBibTeX(mockSearchResultSpecialChars);
      expect(result).toContain("Machine Learning &amp; Deep Learning");
      expect(result).toContain("José García-López and François D&#39;Alembert and Müller-Schmidt");
    });
  });

  describe("formatAPA", () => {
    it("should format a standard paper correctly", () => {
      const result = formatAPA(mockSearchResult);
      expect(result).toBe(
        "Doe, J., Smith, J., & Johnson, B. (2023). Deep Learning for Natural Language Processing: A Survey. arXiv preprint arXiv:2301.12345. https://doi.org/10.1234/example.doi"
      );
    });

    it("should handle single author", () => {
      const result = formatAPA(mockSearchResultSingleAuthor);
      expect(result).toContain("Wilson, A. (2023)");
    });

    it("should handle two authors", () => {
      const result = formatAPA(mockSearchResultTwoAuthors);
      expect(result).toContain("Wilson, A., & Brown, B. (2023)");
    });

    it("should handle many authors with et al", () => {
      const result = formatAPA(mockSearchResultManyAuthors);
      // With MAX_AUTHORS_APA = 20 and only 10 authors, all will be shown
      expect(result).toContain(
        "One, A., Two, A., Three, A., Four, A., Five, A., Six, A., Seven, A., Eight, A., Nine, A., & Ten, A. (2023)"
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatAPA(mockSearchResultNoDOI);
      expect(result).not.toContain("https://doi.org/");
      expect(result).toMatch(/arXiv preprint arXiv:2301\.12345$/);
    });
  });

  describe("formatMLA", () => {
    it("should format a standard paper correctly", () => {
      const result = formatMLA(mockSearchResult);
      expect(result).toContain("Doe, John, Jane Smith, and Bob Johnson");
      expect(result).toContain('"Deep Learning for Natural Language Processing: A Survey."');
      expect(result).toContain("arXiv preprint arXiv:2301.12345");
      expect(result).toContain("15 Jan. 2023");
      expect(result).toContain("Web.");
    });

    it("should handle single author", () => {
      const result = formatMLA(mockSearchResultSingleAuthor);
      expect(result).toContain('Wilson, Alice "');
    });

    it("should handle two authors", () => {
      const result = formatMLA(mockSearchResultTwoAuthors);
      expect(result).toContain('Wilson, Alice and Bob Brown "');
    });

    it("should use et al for more than 3 authors", () => {
      const fourAuthors = { ...mockSearchResult, authors: ["A", "B", "C", "D"] };
      const result = formatMLA(fourAuthors);
      expect(result).toContain(", et al.");
    });
  });

  describe("formatChicago", () => {
    it("should format a standard paper correctly", () => {
      const result = formatChicago(mockSearchResult);
      expect(result).toBe(
        'Doe, John, Jane Smith, and Bob Johnson. "Deep Learning for Natural Language Processing: A Survey." arXiv preprint arXiv:2301.12345 (2023). https://doi.org/10.1234/example.doi'
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatChicago(mockSearchResultNoDOI);
      expect(result).not.toContain("https://doi.org/");
      expect(result).toMatch(/arXiv preprint arXiv:2301\.12345 \(2023\)$/);
    });

    it("should use et al for many authors", () => {
      const result = formatChicago(mockSearchResultManyAuthors);
      // With MAX_AUTHORS_CHICAGO = 10 and exactly 10 authors, all are shown
      expect(result).toContain(
        "One, Author, Author Two, Author Three, Author Four, Author Five, Author Six, Author Seven, Author Eight, Author Nine, and Author Ten."
      );
    });
  });

  describe("formatIEEE", () => {
    it("should format a standard paper correctly", () => {
      const result = formatIEEE(mockSearchResult);
      expect(result).toBe(
        'J. Doe, J. Smith, and B. Johnson, "Deep Learning for Natural Language Processing: A Survey," arXiv preprint arXiv:2301.12345, Jan. 2023, doi: 10.1234/example.doi.'
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatIEEE(mockSearchResultNoDOI);
      expect(result).not.toContain("doi:");
      expect(result).toMatch(/Jan\. 2023\.$/);
    });

    it("should use et al for many authors", () => {
      const result = formatIEEE(mockSearchResultManyAuthors);
      expect(result).toContain(", et al.");
    });
  });

  describe("formatACM", () => {
    it("should format a standard paper correctly", () => {
      const result = formatACM(mockSearchResult);
      expect(result).toBe(
        "Doe, John, Jane Smith, and Bob Johnson. 2023. Deep Learning for Natural Language Processing: A Survey. arXiv preprint arXiv:2301.12345. DOI:https://doi.org/10.1234/example.doi."
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatACM(mockSearchResultNoDOI);
      expect(result).not.toContain("DOI:");
      expect(result).toMatch(/arXiv preprint arXiv:2301\.12345\.$/);
    });

    it("should use et al for many authors", () => {
      const result = formatACM(mockSearchResultManyAuthors);
      expect(result).toContain(", et al.");
    });
  });

  describe("formatHarvard", () => {
    it("should format a standard paper correctly", () => {
      const result = formatHarvard(mockSearchResult);
      expect(result).toBe(
        "Doe, J., Smith, J. and Johnson, B. (2023) 'Deep Learning for Natural Language Processing: A Survey', arXiv preprint arXiv:2301.12345. Available at: https://doi.org/10.1234/example.doi."
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatHarvard(mockSearchResultNoDOI);
      expect(result).not.toContain("Available at:");
      expect(result).toMatch(/arXiv preprint arXiv:2301\.12345\.$/);
    });
  });

  describe("formatTurabian", () => {
    it("should format a standard paper correctly", () => {
      const result = formatTurabian(mockSearchResult);
      expect(result).toBe(
        'Doe, John, Jane Smith, and Bob Johnson. "Deep Learning for Natural Language Processing: A Survey." arXiv preprint arXiv:2301.12345 (2023). https://doi.org/10.1234/example.doi.'
      );
    });

    it("should handle papers without DOI", () => {
      const result = formatTurabian(mockSearchResultNoDOI);
      expect(result).not.toContain("https://doi.org/");
      expect(result).toMatch(/arXiv preprint arXiv:2301\.12345 \(2023\)\.$/);
    });
  });

  describe("getCitation", () => {
    it("should delegate to correct formatter", () => {
      expect(getCitation(mockSearchResult, "apa")).toContain("Doe, J., Smith, J., & Johnson, B.");
      expect(getCitation(mockSearchResult, "mla")).toContain('"Deep Learning for Natural Language Processing');
      expect(getCitation(mockSearchResult, "chicago")).toContain("Doe, John, Jane Smith, and Bob Johnson.");
      expect(getCitation(mockSearchResult, "ieee")).toContain("J. Doe, J. Smith, and B. Johnson,");
      expect(getCitation(mockSearchResult, "acm")).toContain("Doe, John, Jane Smith, and Bob Johnson. 2023.");
      expect(getCitation(mockSearchResult, "harvard")).toContain("Doe, J., Smith, J. and Johnson, B. (2023)");
      expect(getCitation(mockSearchResult, "turabian")).toContain('"Deep Learning for Natural Language Processing');
    });

    it("should default to ACM for unknown style", () => {
      const result = getCitation(mockSearchResult, "unknown" as unknown as CitationStyle);
      expect(result).toContain("Doe, John, Jane Smith, and Bob Johnson. 2023.");
    });
  });

  describe("arXiv ID validation", () => {
    it("should handle new format IDs", () => {
      const paper = { ...mockSearchResult, id: "http://arxiv.org/abs/2301.12345" };
      const result = formatAPA(paper);
      expect(result).toContain("arXiv:2301.12345");
    });

    it("should handle new format IDs with version", () => {
      const paper = { ...mockSearchResult, id: "http://arxiv.org/abs/2301.12345v2" };
      const result = formatAPA(paper);
      expect(result).toContain("arXiv:2301.12345v2");
    });

    it("should handle old format IDs", () => {
      const paper = { ...mockSearchResult, id: "http://arxiv.org/abs/math.GT/0605123" };
      const result = formatAPA(paper);
      expect(result).toContain("arXiv:math.GT/0605123");
    });

    it("should sanitize invalid IDs", () => {
      const paper = { ...mockSearchResult, id: "http://arxiv.org/abs/../../etc/passwd" };
      const result = formatAPA(paper);
      expect(result).toContain("arXiv:etc/passwd");
      expect(result).not.toContain("../");
    });
  });
});
