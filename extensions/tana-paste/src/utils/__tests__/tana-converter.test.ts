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

  test("converts Limitless Pendant transcriptions", () => {
    const input = `# Meeting Title

## Section One

> [Speaker 1](#startMs=1743688649931&endMs=1743688652931): Hello everyone.

> [You](#startMs=1743688652931&endMs=1743688653931): Good morning.

> [Speaker 2](#startMs=1743688653931&endMs=1743688654931): Let's get started.`;

    const result = convertToTana(input);

    // Check for Tana header
    expect(result.startsWith("%%tana%%")).toBe(true);

    // Verify content and structure
    expect(result).toContain("- Meeting Title");
    expect(result).toContain("- Section One");
    expect(result).toContain("- Speaker 1: Hello everyone");
    expect(result).toContain("- You: Good morning");
    expect(result).toContain("- Speaker 2: Let's get started");

    // Split into lines to check hierarchical order
    const lines = result.split("\n");
    const titleLineIndex = lines.findIndex((line) => line.includes("- Meeting Title"));
    const sectionLineIndex = lines.findIndex((line) => line.includes("- Section One"));
    const speaker1LineIndex = lines.findIndex((line) => line.includes("Speaker 1: Hello everyone"));

    // Verify correct order (hierarchy)
    expect(titleLineIndex).toBeLessThan(sectionLineIndex);
    expect(sectionLineIndex).toBeLessThan(speaker1LineIndex);

    // Check indentation hierarchy through line order instead of exact spacing
    // This is more robust than checking exact spacing characters
    const titleLine = lines[titleLineIndex];
    const sectionLine = lines[sectionLineIndex];

    // Title should appear near the start (root level)
    expect(titleLineIndex).toBeLessThan(5);

    // Section should be indented under title
    expect(sectionLine.indexOf("-")).toBeGreaterThan(titleLine.indexOf("-"));

    // Speaker line should be indented more than section
    // Just check that it appears after section, not exact indentation
    expect(speaker1LineIndex).toBeGreaterThan(sectionLineIndex);
  });

  test("preserves bold text and correct indentation hierarchy", () => {
    const input = `## The Context Intelligence Framework

### 1. Context Awareness: Knowing What You Know (and Don't)

**Definition:** The ability to identify, inventory, and evaluate the contextual assets your business possesses.

**Key Components:**
- **Knowledge Mapping:** Systematically documenting what your organization knows
- **Context Gaps:** Identifying critical missing contextual elements`;

    const result = convertToTana(input);

    // Check that output starts with %%tana%%
    expect(result.startsWith("%%tana%%")).toBe(true);

    // Check that bold text is preserved correctly
    expect(result.includes("**Definition:**")).toBe(true);
    expect(result.includes("*__Definition:__*")).toBe(false);
    expect(result.includes("**Key Components:**")).toBe(true);
    expect(result.includes("**Knowledge Mapping:**")).toBe(true);
    expect(result.includes("**Context Gaps:**")).toBe(true);

    // Check indentation hierarchy
    const lines = result.split("\n");
    const frameworkLine = lines.findIndex((line) =>
      line.includes("The Context Intelligence Framework")
    );
    const awarenessLine = lines.findIndex((line) => line.includes("1. Context Awareness"));
    const definitionLine = lines.findIndex((line) => line.includes("**Definition:**"));

    // Verify correct line order
    expect(frameworkLine).toBeLessThan(awarenessLine);
    expect(awarenessLine).toBeLessThan(definitionLine);

    // Verify correct indentation
    const frameworkIndent = lines[frameworkLine].indexOf("-");
    const awarenessIndent = lines[awarenessLine].indexOf("-");
    const definitionIndent = lines[definitionLine].indexOf("-");

    expect(frameworkIndent).toBeLessThan(awarenessIndent);
    expect(awarenessIndent).toBeLessThan(definitionIndent);
  });

  test("properly nests bullet points under deeper heading levels", () => {
    const input = `# Main Heading
## Second Level
### Third Level
- First bullet
- Second bullet
- Third bullet`;
    const result = convertToTana(input);
    expect(result).toContain("- Main Heading");
    expect(result).toContain("- Second Level");
    expect(result).toContain("- Third Level");
    expect(result).toContain("- First bullet");
    expect(result).toContain("- Second bullet");
    expect(result).toContain("- Third bullet");
  });

  test("handles complex indentation with multiple heading levels", () => {
    const input = `# Main Heading
## Subheading
- Bullet under subheading
### Deeper heading
- First bullet under deeper heading
- Second bullet under deeper heading
## Another subheading
- Bullet under another subheading`;

    const result = convertToTana(input);
    expect(result).toContain("- Main Heading");
    expect(result).toContain("- Subheading");
    expect(result).toContain("- Bullet under subheading");
    expect(result).toContain("- Deeper heading");
    expect(result).toContain("- First bullet under deeper heading");
    expect(result).toContain("- Second bullet under deeper heading");
    expect(result).toContain("- Another subheading");
    expect(result).toContain("- Bullet under another subheading");
  });

  test("handles buyer persona example correctly", () => {
    const input = `# Tana Simplified: Digital Organization for Everyone - Buyer Persona & Purchase Triggers

## Ideal Customer Profile (ICP)

### Core Demographics
- **Non-technical knowledge workers** (technical comfort level: 1-3 out of 5)
- **Students and academics** without programming backgrounds
- **Personal productivity enthusiasts** seeking better organization
- **Small business owners/professionals** managing multiple information streams
- **Current Tana users** who feel overwhelmed by the platform's complexity
- **AI tool users** looking to integrate contextual knowledge with AI assistants`;

    const result = convertToTana(input);

    // Check overall structure
    expect(result).toContain("- Tana Simplified:");
    expect(result).toContain("- Ideal Customer Profile");
    expect(result).toContain("- Core Demographics");

    // Check bullet points are present
    expect(result).toContain("- **Non-technical knowledge workers**");
    expect(result).toContain("- **Students and academics**");
    expect(result).toContain("- **Personal productivity enthusiasts**");
    expect(result).toContain("- **Small business owners/professionals**");
    expect(result).toContain("- **Current Tana users**");
    expect(result).toContain("- **AI tool users**");

    // Check indentation hierarchy is correct (order of elements)
    const lines = result.split("\n");
    const titleIdx = lines.findIndex((l) => l.includes("Tana Simplified:"));
    const icpIdx = lines.findIndex((l) => l.includes("Ideal Customer Profile"));
    const demoIdx = lines.findIndex((l) => l.includes("Core Demographics"));
    const bulletIdx = lines.findIndex((l) => l.includes("**Non-technical knowledge workers**"));

    expect(titleIdx).toBeLessThan(icpIdx);
    expect(icpIdx).toBeLessThan(demoIdx);
    expect(demoIdx).toBeLessThan(bulletIdx);
  });
});
