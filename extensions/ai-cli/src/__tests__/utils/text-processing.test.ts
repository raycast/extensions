import { describe, expect, it } from "vitest";
import { cleanAgentResponse, escapeBackticks, splitVariants, truncateText } from "@/utils/text-processing";
import { messages } from "@/locale/en/messages";

describe("Text Processing", () => {
  describe("escapeBackticks", () => {
    it("escapes backticks in text", () => {
      const testCases = [
        { input: "This is `code`", expected: "This is \\`code\\`" },
        { input: "`first` and `second` code blocks", expected: "\\`first\\` and \\`second\\` code blocks" },
        { input: "```\ncode block\n```", expected: "\\`\\`\\`\ncode block\n\\`\\`\\`" },
        { input: "", expected: "" },
        { input: "Normal text without any special characters", expected: "Normal text without any special characters" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(escapeBackticks(input)).toBe(expected);
      });
    });
  });

  describe("cleanAgentResponse", () => {
    it("cleans and templates Claude responses", () => {
      const testCases = [
        // Remove explanation patterns
        { input: "Here's the reformatted text:\n\nActual content here", expected: "Actual content here" },
        { input: "HERE IS YOUR FORMATTED MESSAGE:\n\nActual content", expected: "Actual content" },
        { input: "I've reformatted this for Slack:\n\nActual content", expected: "Actual content" },

        // Remove surrounding quotes
        { input: '"This is quoted content"', expected: "This is quoted content" },
        { input: "'This is single quoted content'", expected: "This is single quoted content" },
        { input: 'This has "partial quotes', expected: 'This has "partial quotes' }, // Partial quotes preserved

        // Multiple processing steps
        { input: 'Here\'s your reformatted text:\n\n"Actual quoted content"', expected: "Actual quoted content" },

        // Whitespace handling
        { input: "   \n\n  Content with whitespace  \n\n   ", expected: "Content with whitespace" },
        { input: "", expected: "" },
        { input: "   \n\t  ", expected: "" },

        // Codex pattern extraction
        {
          input:
            "[2025-08-22T21:43:29] OpenAI Codex v0.23.0 (research preview)\n--------\nworkdir: /Users/mkaczkowski/IdeaProjects/devpromptai-raycast2\nmodel: gpt-5\nprovider: openai\napproval: never\nsandbox: read-only\nreasoning effort: medium\nreasoning summaries: auto\n--------\n[2025-08-22T21:43:29] User instructions:\n## Instructions\nYou are helping format the following text for Slack communication.\n\n## Text\nhi\n\n## Requirements\n- Break up longer text into digestible chunks\n- Include relevant emojis but keep them purposeful and professional (but don't overdo it)\n- Use formatting like *bold* and _italics_ when helpful but only when appropriate\n\n## Output Format\nOutput only the formatted text as Slack message ready to send\n[2025-08-22T21:43:35] codex\n\nHi :wave:\n[2025-08-22T21:43:35] tokens used: 5533",
          expected: "Hi :wave:",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(cleanAgentResponse(input)).toBe(expected);
      });
    });
  });

  describe("truncateText", () => {
    it("truncates long text appropriately", () => {
      const suffix = messages.textProcessing.truncatedSuffix;
      const testCases = [
        // No truncation needed
        { text: "Short text", maxLength: 100, expected: "Short text" },
        { text: "", maxLength: 10, expected: "" },

        // Truncation required
        {
          text: "This is a very long text that needs to be truncated",
          maxLength: 20,
          expected: "This is a very long " + suffix,
        },
        { text: "Exactly 20 chars!!", maxLength: 10, expected: "Exactly 20" + suffix },
        { text: "Any text", maxLength: 0, expected: suffix },
      ];

      testCases.forEach(({ text, maxLength, expected }) => {
        expect(truncateText(text, maxLength)).toBe(expected);
      });
    });
  });

  describe("splitVariants", () => {
    it("always returns a single variant in single-variant mode", () => {
      const single = splitVariants("Single variant text");
      expect(single).toHaveLength(1);
      expect(single[0]).toMatchObject({ content: "Single variant text", index: 0 });
      expect(single[0].id).toMatch(/^var-\d+-\d+(-.*)?$/);

      const multiVariantText = "First variant\n=== VARIANT ===\nSecond variant\n=== VARIANT ===\nThird variant";
      const result = splitVariants(multiVariantText);
      expect(result).toHaveLength(1);
      // Content is the full text trimmed (delimiter not interpreted)
      expect(result[0].content).toBe(multiVariantText);
    });

    it("trims content but ignores delimiters", () => {
      const textWithWhitespace = "  First\n\n=== VARIANT ===\n\nSecond  ";
      const result = splitVariants(textWithWhitespace);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("First\n\n=== VARIANT ===\n\nSecond");

      const noDelimiters = splitVariants("No delimiters here");
      expect(noDelimiters).toHaveLength(1);
      expect(noDelimiters[0].content).toBe("No delimiters here");
    });
  });
});
