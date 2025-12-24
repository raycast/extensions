/**
 * Unit tests for formatter utility functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatNumber, formatRelativeTime, extractCodeBlocks } from "../formatters";

describe("formatNumber", () => {
  describe("valid numbers", () => {
    it("should format numbers below 1000 as-is", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(1)).toBe("1");
      expect(formatNumber(527)).toBe("527");
      expect(formatNumber(999)).toBe("999");
    });

    it("should format thousands with K suffix (no decimals)", () => {
      expect(formatNumber(1000)).toBe("1K");
      expect(formatNumber(1499)).toBe("1K"); // rounds down
      expect(formatNumber(1500)).toBe("2K"); // rounds up
      expect(formatNumber(13000)).toBe("13K");
      expect(formatNumber(572000)).toBe("572K");
      expect(formatNumber(999499)).toBe("999K");
      expect(formatNumber(999500)).toBe("1000K"); // rounds to 1000K
    });

    it("should format millions with M suffix (no decimals)", () => {
      expect(formatNumber(1000000)).toBe("1M");
      expect(formatNumber(1499999)).toBe("1M"); // rounds down
      expect(formatNumber(1500000)).toBe("2M"); // rounds up
      expect(formatNumber(13500000)).toBe("14M");
      expect(formatNumber(999999999)).toBe("1000M");
    });

    it("should handle edge cases at boundaries", () => {
      expect(formatNumber(999)).toBe("999");
      expect(formatNumber(1000)).toBe("1K");
      expect(formatNumber(999999)).toBe("1000K");
      expect(formatNumber(1000000)).toBe("1M");
    });
  });

  describe("invalid inputs", () => {
    it("should return '0' for null or undefined", () => {
      expect(formatNumber(null as unknown as number)).toBe("0");
      expect(formatNumber(undefined as unknown as number)).toBe("0");
    });

    it("should return '0' for NaN", () => {
      expect(formatNumber(NaN)).toBe("0");
    });

    it("should return '0' for negative numbers", () => {
      expect(formatNumber(-1)).toBe("0");
      expect(formatNumber(-100)).toBe("0");
      expect(formatNumber(-1000)).toBe("0");
    });
  });
});

describe("formatRelativeTime", () => {
  const MOCK_NOW = new Date("2024-01-15T12:00:00Z").getTime();

  beforeEach(() => {
    // Mock Date constructor to return a fixed timestamp
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  // Cleanup is handled automatically by vitest

  it("should return 'now' for times less than 1 minute ago", () => {
    const thirtySecondsAgo = new Date(MOCK_NOW - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe("now");

    const fiveSecondsAgo = new Date(MOCK_NOW - 5 * 1000).toISOString();
    expect(formatRelativeTime(fiveSecondsAgo)).toBe("now");
  });

  it("should format minutes correctly", () => {
    const oneMinuteAgo = new Date(MOCK_NOW - 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1m");

    const thirtyMinutesAgo = new Date(MOCK_NOW - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe("30m");

    const fiftyNineMinutesAgo = new Date(MOCK_NOW - 59 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe("59m");
  });

  it("should format hours correctly", () => {
    const oneHourAgo = new Date(MOCK_NOW - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe("1h");

    const twelveHoursAgo = new Date(MOCK_NOW - 12 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twelveHoursAgo)).toBe("12h");

    const twentyThreeHoursAgo = new Date(MOCK_NOW - 23 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe("23h");
  });

  it("should format days correctly", () => {
    const oneDayAgo = new Date(MOCK_NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe("1d");

    const threeDaysAgo = new Date(MOCK_NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d");

    const sixDaysAgo = new Date(MOCK_NOW - 6 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(sixDaysAgo)).toBe("6d");
  });

  it("should format weeks correctly", () => {
    const oneWeekAgo = new Date(MOCK_NOW - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneWeekAgo)).toBe("1w");

    const twoWeeksAgo = new Date(MOCK_NOW - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoWeeksAgo)).toBe("2w");

    const fourWeeksAgo = new Date(MOCK_NOW - 28 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fourWeeksAgo)).toBe("4w");
  });

  it("should format months correctly", () => {
    const oneMonthAgo = new Date(MOCK_NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMonthAgo)).toBe("1mo");

    const twoMonthsAgo = new Date(MOCK_NOW - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoMonthsAgo)).toBe("2mo");

    const elevenMonthsAgo = new Date(MOCK_NOW - 330 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(elevenMonthsAgo)).toBe("11mo");
  });

  it("should format years correctly", () => {
    const oneYearAgo = new Date(MOCK_NOW - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneYearAgo)).toBe("1y");

    const twoYearsAgo = new Date(MOCK_NOW - 730 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoYearsAgo)).toBe("2y");

    const fiveYearsAgo = new Date(MOCK_NOW - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveYearsAgo)).toBe("5y");
  });

  it("should handle boundary cases correctly", () => {
    // Exactly 59 seconds -> "now"
    const fiftyNineSeconds = new Date(MOCK_NOW - 59 * 1000).toISOString();
    expect(formatRelativeTime(fiftyNineSeconds)).toBe("now");

    // Exactly 60 seconds -> "1m"
    const sixtySeconds = new Date(MOCK_NOW - 60 * 1000).toISOString();
    expect(formatRelativeTime(sixtySeconds)).toBe("1m");

    // Just under 24 hours -> hours
    const almostADay = new Date(MOCK_NOW - 23.9 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(almostADay)).toBe("23h");

    // Exactly 24 hours -> "1d"
    const exactlyADay = new Date(MOCK_NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(exactlyADay)).toBe("1d");
  });
});

describe("extractCodeBlocks", () => {
  it("should extract a single code block without language identifier", () => {
    const markdown = "Some text\n```\ncode line 1\ncode line 2\n```\nMore text";
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("code line 1\ncode line 2");
  });

  it("should extract a single code block with language identifier", () => {
    const markdown = "Some text\n```typescript\nconst x = 1;\nconsole.log(x);\n```\nMore text";
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("const x = 1;\nconsole.log(x);");
  });

  it("should extract multiple code blocks", () => {
    const markdown = `
# Title

\`\`\`javascript
const a = 1;
\`\`\`

Some text in between

\`\`\`python
def foo():
    return True
\`\`\`

More text

\`\`\`
plain code
\`\`\`
`;
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("const a = 1;");
    expect(result[1]).toBe("def foo():\n    return True");
    expect(result[2]).toBe("plain code");
  });

  it("should return empty array for text without code blocks", () => {
    const markdown = "This is just plain text with no code blocks.";
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should handle empty markdown", () => {
    const result = extractCodeBlocks("");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should preserve indentation within code blocks", () => {
    const markdown = `
\`\`\`typescript
function example() {
  if (true) {
    console.log("indented");
  }
}
\`\`\`
`;
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('function example() {\n  if (true) {\n    console.log("indented");\n  }\n}');
  });

  it("should handle code blocks with empty lines", () => {
    const markdown = `
\`\`\`javascript
const a = 1;

const b = 2;

console.log(a, b);
\`\`\`
`;
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("const a = 1;\n\nconst b = 2;\n\nconsole.log(a, b);");
  });

  it("should handle nested backticks inside code blocks", () => {
    const markdown = "```\nThis has `inline code` inside\n```";
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("This has `inline code` inside");
  });

  it("should not extract inline code (single backticks)", () => {
    const markdown = "This has `inline code` but no blocks";
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should handle code blocks with various language identifiers", () => {
    const markdown = `
\`\`\`bash
npm install
\`\`\`

\`\`\`json
{"key": "value"}
\`\`\`

\`\`\`shell
ls -la
\`\`\`
`;
    const result = extractCodeBlocks(markdown);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("npm install");
    expect(result[1]).toBe('{"key": "value"}');
    expect(result[2]).toBe("ls -la");
  });
});
