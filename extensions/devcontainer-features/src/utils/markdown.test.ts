import { describe, expect, it } from "vitest";
import {
  convertRelativeImagePaths,
  escapeTableCell,
  formatEnumValues,
  stripFirstH1,
  truncateText,
} from "./markdown";

describe("convertRelativeImagePaths", () => {
  const sourceInfo = "devcontainers/features";
  const featureId = "python";

  it("converts relative image paths to absolute URLs", () => {
    const markdown = "![Screenshot](./assets/screenshot.png)";
    const result = convertRelativeImagePaths(markdown, sourceInfo, featureId);

    expect(result).toBe(
      "![Screenshot](https://raw.githubusercontent.com/devcontainers/features/main/src/python/assets/screenshot.png)",
    );
  });

  it("converts paths without ./ prefix", () => {
    const markdown = "![Icon](icon.png)";
    const result = convertRelativeImagePaths(markdown, sourceInfo, featureId);

    expect(result).toBe(
      "![Icon](https://raw.githubusercontent.com/devcontainers/features/main/src/python/icon.png)",
    );
  });

  it("preserves absolute URLs", () => {
    const markdown = "![External](https://example.com/image.png)";
    const result = convertRelativeImagePaths(markdown, sourceInfo, featureId);

    expect(result).toBe("![External](https://example.com/image.png)");
  });

  it("handles multiple images", () => {
    const markdown = "![A](./a.png)\n![B](./b.png)";
    const result = convertRelativeImagePaths(markdown, sourceInfo, featureId);

    expect(result).toContain(
      "https://raw.githubusercontent.com/devcontainers/features/main/src/python/a.png",
    );
    expect(result).toContain(
      "https://raw.githubusercontent.com/devcontainers/features/main/src/python/b.png",
    );
  });
});

describe("stripFirstH1", () => {
  it("removes first H1 heading", () => {
    const markdown = "# Title\n\nContent here";
    const result = stripFirstH1(markdown);

    expect(result).toBe("Content here");
  });

  it("preserves content when no H1", () => {
    const markdown = "## H2 Title\n\nContent";
    const result = stripFirstH1(markdown);

    expect(result).toBe("## H2 Title\n\nContent");
  });

  it("only removes first H1", () => {
    const markdown = "# First\n\n# Second\n\nContent";
    const result = stripFirstH1(markdown);

    expect(result).toBe("# Second\n\nContent");
  });
});

describe("truncateText", () => {
  it("returns text unchanged if within limit", () => {
    expect(truncateText("short", 10)).toBe("short");
  });

  it("truncates text with ellipsis", () => {
    expect(truncateText("this is a long text", 10)).toBe("this is...");
  });

  it("handles exact length", () => {
    expect(truncateText("12345", 5)).toBe("12345");
  });
});

describe("escapeTableCell", () => {
  it("escapes pipe characters", () => {
    expect(escapeTableCell("a|b|c")).toBe("a\\|b\\|c");
  });

  it("replaces newlines with spaces", () => {
    expect(escapeTableCell("line1\nline2")).toBe("line1 line2");
  });

  it("trims whitespace", () => {
    expect(escapeTableCell("  text  ")).toBe("text");
  });
});

describe("formatEnumValues", () => {
  it("formats all values when within limit", () => {
    expect(formatEnumValues(["a", "b", "c"], 3)).toBe("a \\| b \\| c");
  });

  it("truncates values exceeding limit", () => {
    expect(formatEnumValues(["a", "b", "c", "d", "e"], 3)).toBe(
      "a \\| b \\| c, ... (+2 more)",
    );
  });

  it("uses default limit of 3", () => {
    expect(formatEnumValues(["a", "b", "c", "d"])).toBe(
      "a \\| b \\| c, ... (+1 more)",
    );
  });
});
