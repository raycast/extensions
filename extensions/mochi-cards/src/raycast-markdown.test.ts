import { describe, expect, it } from "vitest";

import { renderRaycastMarkdown } from "./raycast-markdown";

describe("renderRaycastMarkdown", () => {
  it("converts HTML horizontal rule tags to Markdown horizontal rules", () => {
    expect(renderRaycastMarkdown("Before<hr />After")).toBe("Before\n\n---\n\nAfter");
  });

  it("preserves Mochi's visible line breaks", () => {
    expect(renderRaycastMarkdown("**vez** `/bes/`\nnoun\n**time, turn**")).toBe(
      "**vez** `/bes/`  \nnoun  \n**time, turn**"
    );
  });
});
