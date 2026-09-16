import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  prepareReadableMarkdown,
  prepareWebMarkdown,
  renderRichText,
} from "../src/core/rich-text";
import {
  isNearBottom,
  restoreReadingPosition,
  shouldFollowLatest,
} from "../src/core/scroll";

describe("structured response regression", () => {
  it("restores numbered sections that start above one instead of collapsing them into prose", () => {
    const source =
      "**Specialist status**\n16. **Alpha** — first status.\n17. **Beta** — second status.\n\n**Held**\n23. First held item.\n24. Second held item.";
    const output = prepareReadableMarkdown(source);
    const ast = unified().use(remarkParse).parse(output);
    const lists = ast.children.filter((node) => node.type === "list");
    expect(lists).toHaveLength(2);
    expect(lists[0]).toMatchObject({ ordered: true, start: 16 });
    expect(lists[0].children).toHaveLength(2);
    expect(lists[1]).toMatchObject({ ordered: true, start: 23 });
    expect(lists[1].children).toHaveLength(2);
  });
  it("preserves explicit text line breaks in the native Markdown pane", () =>
    expect(renderRichText("First line\nSecond line")).toBe(
      "First line  \nSecond line",
    ));
  it("does not modify code blocks, tables, or multiline equations to force wrapping", () => {
    const code =
      "```python\n# Heading\n16. invalid_python_example\n    return '$x$'\n```";
    const math = String.raw`\[
\begin{aligned}
x &= 1 \\
y &= 2
\end{aligned}
\]`;
    expect(prepareReadableMarkdown(code)).toBe(code);
    expect(renderRichText(code)).toBe(code);
    expect(renderRichText(math)).toBe(math);
    expect(prepareWebMarkdown(code)).toBe(code);
  });
  it("adapts native math delimiters for the browser while leaving literal code untouched", () => {
    expect(
      prepareWebMarkdown(String.raw`Inline \(x^2\) and \[y=2\]`),
    ).toContain("$x^2$");
    expect(prepareWebMarkdown(String.raw`\[y=2\]`)).toContain("$$\ny=2\n$$");
    expect(
      prepareWebMarkdown(String.raw`\begin{equation}x=1\end{equation}`),
    ).toContain("$$\nx=1\n$$");
    expect(prepareWebMarkdown("`\\(literal\\)`")).toBe("`\\(literal\\)`");
  });
  it("separates a standalone section label from the previous paragraph", () =>
    expect(
      prepareReadableMarkdown("Previous paragraph\n**Next section**\nContent"),
    ).toBe("Previous paragraph\n\n**Next section**\nContent"));
  it("does not treat a monetary range as inline math in the native view", () =>
    expect(renderRichText("Between $5 and $10.")).toBe("Between $5 and $10."));
});

describe("chat reading position", () => {
  it("opens at the latest message once", () =>
    expect(shouldFollowLatest(true, false, false)).toBe(true));
  it("follows new messages only when the reader is already following", () => {
    expect(shouldFollowLatest(false, true, false)).toBe(true);
    expect(shouldFollowLatest(false, false, false)).toBe(false);
  });
  it("never forces the bottom when loading earlier history", () =>
    expect(shouldFollowLatest(false, true, true)).toBe(false));
  it("detects intentional scrolling up", () => {
    expect(isNearBottom(100, 500, 1200)).toBe(false);
    expect(isNearBottom(690, 500, 1200)).toBe(true);
    expect(isNearBottom(0, 500, 100)).toBe(true);
  });
  it("preserves an anchored message after older messages are inserted", () => {
    expect(restoreReadingPosition(200, 15, 415)).toBe(600);
    expect(restoreReadingPosition(200, 15, 15)).toBe(200);
    expect(restoreReadingPosition(10, 100, 0)).toBe(0);
  });
});
