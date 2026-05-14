import {
  escapeHtml,
  parseAuthorName,
  formatAuthorLastFirst,
  formatAuthorFirstLast,
  formatAuthorFull,
  formatAuthorList,
} from "./authorFormatting";

describe("Author Formatting Utils", () => {
  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      expect(escapeHtml("John & Jane")).toBe("John &amp; Jane");
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;&#x2F;script&gt;"
      );
      expect(escapeHtml("Test \"quotes\" and 'apostrophes'")).toBe("Test &quot;quotes&quot; and &#39;apostrophes&#39;");
      expect(escapeHtml("Path/to/file=value`backtick`")).toBe("Path&#x2F;to&#x2F;file&#x3D;value&#x60;backtick&#x60;");
    });

    it("should leave normal text unchanged", () => {
      expect(escapeHtml("John Doe")).toBe("John Doe");
      expect(escapeHtml("García-López")).toBe("García-López");
      expect(escapeHtml("Müller")).toBe("Müller");
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });
  });

  describe("parseAuthorName", () => {
    it("should parse full names correctly", () => {
      const result = parseAuthorName("John Michael Doe");
      expect(result).toEqual({
        firstName: "John",
        middleNames: ["Michael"],
        lastName: "Doe",
        initials: "J. M.",
      });
    });

    it("should handle names with no middle names", () => {
      const result = parseAuthorName("Jane Smith");
      expect(result).toEqual({
        firstName: "Jane",
        middleNames: [],
        lastName: "Smith",
        initials: "J.",
      });
    });

    it("should handle single-word names", () => {
      const result = parseAuthorName("Madonna");
      expect(result).toEqual({
        firstName: "",
        middleNames: [],
        lastName: "Madonna",
        initials: "",
      });
    });

    it("should handle empty or whitespace", () => {
      expect(parseAuthorName("")).toEqual({
        firstName: "",
        middleNames: [],
        lastName: "Unknown",
        initials: "",
      });
      expect(parseAuthorName("   ")).toEqual({
        firstName: "",
        middleNames: [],
        lastName: "Unknown",
        initials: "",
      });
    });

    it("should handle multiple middle names", () => {
      const result = parseAuthorName("John Paul George Ringo Starr");
      expect(result).toEqual({
        firstName: "John",
        middleNames: ["Paul", "George", "Ringo"],
        lastName: "Starr",
        initials: "J. P. G. R.",
      });
    });

    it("should escape HTML in names", () => {
      const result = parseAuthorName("John <script> Doe");
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
    });
  });

  describe("formatAuthorLastFirst", () => {
    it("should format as LastName, F.M.", () => {
      expect(formatAuthorLastFirst("John Michael Doe")).toBe("Doe, J. M.");
      expect(formatAuthorLastFirst("Jane Smith")).toBe("Smith, J.");
      expect(formatAuthorLastFirst("Madonna")).toBe("Madonna");
    });

    it("should handle special characters", () => {
      expect(formatAuthorLastFirst("José García-López")).toBe("García-López, J.");
      expect(formatAuthorLastFirst("François D'Alembert")).toBe("D&#39;Alembert, F.");
    });
  });

  describe("formatAuthorFirstLast", () => {
    it("should format as F.M. LastName", () => {
      expect(formatAuthorFirstLast("John Michael Doe")).toBe("J. M. Doe");
      expect(formatAuthorFirstLast("Jane Smith")).toBe("J. Smith");
      expect(formatAuthorFirstLast("Madonna")).toBe("Madonna");
    });

    it("should handle special characters", () => {
      expect(formatAuthorFirstLast("José García-López")).toBe("J. García-López");
      expect(formatAuthorFirstLast("François D'Alembert")).toBe("F. D&#39;Alembert");
    });
  });

  describe("formatAuthorFull", () => {
    it("should return escaped full name", () => {
      expect(formatAuthorFull("John Doe")).toBe("John Doe");
      expect(formatAuthorFull("John & Jane")).toBe("John &amp; Jane");
      expect(formatAuthorFull("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;&#x2F;script&gt;"
      );
    });
  });

  describe("formatAuthorList", () => {
    const mockFormatFull = (author: string) => author;
    const mockFormatLastFirst = (author: string) => {
      const parts = author.split(" ");
      return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts[0]}` : author;
    };

    it("should handle empty or undefined authors", () => {
      const options = { maxAuthors: 3, formatSingle: mockFormatFull };
      expect(formatAuthorList([], options)).toBe("Unknown");
      expect(formatAuthorList(undefined as unknown as string[], options)).toBe("Unknown");
    });

    it("should handle single author", () => {
      const options = { maxAuthors: 3, formatSingle: mockFormatFull };
      expect(formatAuthorList(["John Doe"], options)).toBe("John Doe");
    });

    it("should handle two authors", () => {
      const options = { maxAuthors: 3, formatSingle: mockFormatFull };
      expect(formatAuthorList(["John Doe", "Jane Smith"], options)).toBe("John Doe and Jane Smith");
    });

    it("should handle three authors within limit", () => {
      const options = { maxAuthors: 3, formatSingle: mockFormatFull };
      expect(formatAuthorList(["John", "Jane", "Bob"], options)).toBe("John, Jane, and Bob");
    });

    it("should use et al for authors exceeding limit", () => {
      const options = { maxAuthors: 3, formatSingle: mockFormatFull };
      expect(formatAuthorList(["A", "B", "C", "D", "E"], options)).toBe("A, et al.");
    });

    it("should respect custom separators", () => {
      const options = {
        maxAuthors: 3,
        formatSingle: mockFormatFull,
        separator: "; ",
        lastSeparator: " & ",
      };
      expect(formatAuthorList(["John", "Jane", "Bob"], options)).toBe("John; Jane & Bob");
    });

    it("should respect custom et al string", () => {
      const options = {
        maxAuthors: 2,
        formatSingle: mockFormatFull,
        etAl: " and others",
      };
      expect(formatAuthorList(["A", "B", "C"], options)).toBe("A and others");
    });

    it("should handle maxDisplay different from maxAuthors", () => {
      const options = {
        maxAuthors: 20,
        maxDisplay: 3,
        formatSingle: mockFormatFull,
      };
      expect(formatAuthorList(["A", "B", "C", "D", "E", "F"], options)).toBe("A, B, C, et al.");
    });

    it("should apply formatting function to each author", () => {
      const options = {
        maxAuthors: 3,
        formatSingle: mockFormatLastFirst,
      };
      expect(formatAuthorList(["John Doe", "Jane Smith"], options)).toBe("Doe, John and Smith, Jane");
    });

    it("should handle complex scenario with all options", () => {
      const options = {
        maxAuthors: 10,
        maxDisplay: 3,
        separator: "; ",
        lastSeparator: "; and ",
        etAl: "...",
        formatSingle: (a: string) => a.toUpperCase(),
      };
      const authors = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"];
      expect(formatAuthorList(authors, options)).toBe("ALICE; BOB; CHARLIE...");
    });
  });
});
