import { describe, expect, it } from "vitest";
import { markdownToHtml, markdownToPlain, prepareMarkdown } from "../src/lib/markdown-render";

const sample = `## What broke

Hey, the test is still running, so I'll keep polling for updates
  until it finishes and only then write back.

- OpenAI returns 400: "Item rs_abc of type reasoning was provided
  without its required following item."
- Trigger: history replay includes assistant turns with only
  thinking, often from aborted runs.

\`\`\`ts
function hello() {
  return 1
}
\`\`\`
`;

describe("prepareMarkdown", () => {
  it("joins hard-wrapped markdown before rendering", () => {
    const prepared = prepareMarkdown(sample);
    expect(prepared).toContain(
      "Hey, the test is still running, so I'll keep polling for updates until it finishes and only then write back.",
    );
    expect(prepared).toContain("```ts\nfunction hello() {\n  return 1\n}\n```");
  });
});

describe("markdownToPlain", () => {
  it("strips markers so the result is readable without markdown syntax", () => {
    const plain = markdownToPlain(prepareMarkdown(sample));
    expect(plain).not.toContain("##");
    expect(plain).toContain("What broke");
    expect(plain).toMatch(/•\s+OpenAI returns 400/);
    expect(plain).toContain("function hello() {");
    expect(plain).not.toContain("```");
  });
});

describe("markdownToHtml", () => {
  it("emits headings, lists, and a code block", () => {
    const html = markdownToHtml(prepareMarkdown(sample));
    expect(html).toContain("<h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("<pre>");
    expect(html).toContain("function hello()");
  });
});
