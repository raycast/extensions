import { convertToTana } from "../tana-converter";

describe("Tana Converter", () => {
  test("converts basic markdown bullet points", () => {
    const input = `- First item
- Second item
- Third item`;
    const expected = `%%tana%%
  - First item
  - Second item
  - Third item
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("converts numbered lists", () => {
    const input = `1. First item
2. Second item
3. Third item`;
    const expected = `%%tana%%
  - First item
  - Second item
  - Third item
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("converts markdown headings", () => {
    const input = `# Heading 1
## Heading 2
### Heading 3`;
    const expected = `%%tana%%
- Heading 1
  - Heading 2
    - Heading 3
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("handles nested lists", () => {
    const input = `- Parent
  - Child 1
  - Child 2
- Another parent`;
    const expected = `%%tana%%
  - Parent
    - Child 1
    - Child 2
  - Another parent
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("handles colons", () => {
    const input = `Topic: Some details about the topic`;
    const expected = `%%tana%%
  - Topic: Some details about the topic
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("handles real fields", () => {
    const input = `field::value`;
    const expected = `%%tana%%
  - field::value
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("handles real tags", () => {
    const input = `#tag`;
    const expected = `%%tana%%
- #tag
`;
    expect(convertToTana(input)).toBe(expected);
  });

  test("handles YouTube timestamps", () => {
    const input = `[00:00] Introduction
[01:23] Main topic`;
    const expected = `%%tana%%
  - [00:00] Introduction
  - [01:23] Main topic
`;
    expect(convertToTana(input)).toBe(expected);
  });
});
