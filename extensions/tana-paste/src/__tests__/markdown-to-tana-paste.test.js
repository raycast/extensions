"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
import { markdownToTanaPaste } from "../utils"; // Assuming utils.ts will hold our function
describe("markdownToTanaPaste", () => {
  it("should prepend %%tana%% to the output", () => {
    const markdown = "Hello";
    const expectedTanaPaste = "%%tana%%\n- Hello";
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert markdown headings to Tana headings with correct indentation", () => {
    const markdown = "# Heading 1\n## Heading 2\n### Heading 3\n Text under H3";
    const expectedTanaPaste = `%%tana%%\n- !! Heading 1\n  - !! Heading 2\n    - !! Heading 3\n      - Text under H3`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert unordered lists with correct indentation", () => {
    const markdown = "- Item 1\n  - Item 1.1\n    - Item 1.1.1\n- Item 2";
    const expectedTanaPaste = `%%tana%%\n- Item 1\n  - Item 1.1\n    - Item 1.1.1\n- Item 2`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert ordered lists with correct indentation", () => {
    const markdown = "1. Item 1\n   1. Item 1.1\n      1. Item 1.1.1\n2. Item 2";
    const expectedTanaPaste = `%%tana%%\n- Item 1\n  - Item 1.1\n    - Item 1.1.1\n- Item 2`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert links", () => {
    const markdown = "[Tana Website](https://tana.inc)";
    const expectedTanaPaste = "%%tana%%\n- [Tana Website](https://tana.inc)";
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert bold text correctly", () => {
    const markdown = "Some **bold** and __more bold__ text";
    const expectedTanaPaste = "%%tana%%\n- Some **bold** and **more bold** text"; // Tana uses **bold**
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should convert italic text correctly", () => {
    const markdown = "Some *italic* and _more italic_ text";
    const expectedTanaPaste = "%%tana%%\n- Some __italic__ and __more italic__ text"; // Tana uses __italic__
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should handle bold and italic together", () => {
    const markdown = "Mix _italic_ and **bold** text";
    const expectedTanaPaste = "%%tana%%\n- Mix __italic__ and **bold** text";
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should handle mixed content", () => {
    const markdown = `# My List

- Item 1 with [a link](http://example.com)
- Item 2 with **bold** text
  - Sub-item with _italic_`;
    const expectedTanaPaste = `%%tana%%\n- !! My List\n  - Item 1 with [a link](http://example.com)\n  - Item 2 with **bold** text\n    - Sub-item with __italic__`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should handle paragraphs as simple nodes", () => {
    const markdown = "This is paragraph 1.\n\nThis is paragraph 2.";
    const expectedTanaPaste = "%%tana%%\n- This is paragraph 1.\n- This is paragraph 2.";
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  // --- Tests for Heading-Based Indentation ---
  it("should indent paragraphs under a heading", () => {
    const markdown = `# Heading 1\nParagraph 1.\nParagraph 2.`;
    const expectedTanaPaste = `%%tana%%\n- !! Heading 1\n  - Paragraph 1.\n  - Paragraph 2.`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should indent lists under a heading", () => {
    const markdown = `## Heading 2\n- Item 1\n  - Item 1.1\n- Item 2`;
    const expectedTanaPaste = `%%tana%%\n- !! Heading 2\n  - Item 1\n    - Item 1.1\n  - Item 2`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should indent content under nested headings correctly", () => {
    const markdown = `# H1\nText under H1\n## H2\nText under H2\n### H3\nText under H3`;
    const expectedTanaPaste = `%%tana%%\n- !! H1\n  - Text under H1\n  - !! H2\n    - Text under H2\n    - !! H3\n      - Text under H3`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should reset indentation for headings of same or higher level", () => {
    const markdown = `# H1 A\nText A\n## H2 A\nText B\n# H1 B\nText C\n## H2 B\nText D`;
    const expectedTanaPaste = `%%tana%%\n- !! H1 A\n  - Text A\n  - !! H2 A\n    - Text B\n- !! H1 B\n  - Text C\n  - !! H2 B\n    - Text D`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
  it("should correctly indent lists nested under headings with mixed content", () => {
    const markdown = `# Top Level
Some intro text.
## Sub Level 1
- List 1 Item 1
- List 1 Item 2
  - Sub List 1.1
More text after list 1.
## Sub Level 2
Paragraph under Sub Level 2.
# Another Top Level
- Final List Item`;
    const expectedTanaPaste = `%%tana%%\n- !! Top Level\n  - Some intro text.\n  - !! Sub Level 1\n    - List 1 Item 1\n    - List 1 Item 2\n      - Sub List 1.1\n    - More text after list 1.\n  - !! Sub Level 2\n    - Paragraph under Sub Level 2.\n- !! Another Top Level\n  - Final List Item`;
    expect(markdownToTanaPaste(markdown)).toBe(expectedTanaPaste);
  });
});
