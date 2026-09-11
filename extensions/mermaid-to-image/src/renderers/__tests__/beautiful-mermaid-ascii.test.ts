import { describe, expect, it, vi } from "vitest";
import { renderBeautifulMermaidAscii } from "../beautiful-mermaid-ascii";

describe("renderBeautifulMermaidAscii", () => {
  it("renders with pure ASCII and no color codes", () => {
    const renderMermaidASCII = vi.fn(() => "ascii-output");

    const result = renderBeautifulMermaidAscii("graph TD\nA-->B", {
      renderMermaidASCII,
    });

    expect(result).toBe("ascii-output");
    expect(renderMermaidASCII).toHaveBeenCalledWith("graph TD\nA-->B", {
      useAscii: true,
      colorMode: "none",
    });
  });
});
