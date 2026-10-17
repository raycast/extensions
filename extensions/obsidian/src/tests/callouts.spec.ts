import { describe, it, expect } from "vitest";
import {
  isCalloutStart,
  parseCalloutHeader,
  removeBlockquotePrefix,
  parseBlocks,
  renderCalloutBlock,
  renderBlocks,
  renderCallouts,
  type Block,
  type CalloutBlock,
} from "@/obsidian/internal/callouts";

describe("Callouts - Two Phase Approach", () => {
  // ===========================================
  // PHASE 0: Helper Functions
  // ===========================================
  describe("Helper Functions", () => {
    describe("isCalloutStart", () => {
      it("should return true for valid callout start lines", () => {
        expect(isCalloutStart("> [!note] Title")).toBe(true);
        expect(isCalloutStart("> [!warning]")).toBe(true);
        expect(isCalloutStart(">   [!info]   Some title")).toBe(true);
        expect(isCalloutStart("> [!custom-type] Test")).toBe(true);
      });

      it("should return false for non-callout lines", () => {
        expect(isCalloutStart("> Regular blockquote")).toBe(false);
        expect(isCalloutStart("Normal text")).toBe(false);
        expect(isCalloutStart("> > Nested quote")).toBe(false);
        expect(isCalloutStart("[!note] No blockquote")).toBe(false);
        expect(isCalloutStart("")).toBe(false);
      });

      it("should handle edge cases", () => {
        expect(isCalloutStart("> [!]")).toBe(false); // Empty type - requires at least one char
        expect(isCalloutStart("> [! note]")).toBe(true); // Space in type - valid
        expect(isCalloutStart("> [ !note]")).toBe(false); // Space before ! - invalid
      });
    });

    describe("parseCalloutHeader", () => {
      it("should parse callout with title", () => {
        const result = parseCalloutHeader("> [!note] Important Information");
        expect(result).toEqual({
          type: "note",
          title: "Important Information",
        });
      });

      it("should parse callout without title", () => {
        const result = parseCalloutHeader("> [!warning]");
        expect(result).toEqual({
          type: "warning",
          title: "",
        });
      });

      it("should normalize type to lowercase", () => {
        const result = parseCalloutHeader("> [!WARNING] Alert");
        expect(result).toEqual({
          type: "warning",
          title: "Alert",
        });
      });

      it("should trim whitespace from type and title", () => {
        const result = parseCalloutHeader(">   [!  note  ]   Title with spaces  ");
        expect(result).toEqual({
          type: "note",
          title: "Title with spaces",
        });
      });

      it("should return null for invalid lines", () => {
        expect(parseCalloutHeader("> Regular text")).toBe(null);
        expect(parseCalloutHeader("Not a blockquote")).toBe(null);
        expect(parseCalloutHeader("")).toBe(null);
      });

      it("should handle special characters in title", () => {
        const result = parseCalloutHeader("> [!note] Title with \"quotes\" and 'apostrophes'");
        expect(result?.title).toBe("Title with \"quotes\" and 'apostrophes'");
      });
    });

    describe("removeBlockquotePrefix", () => {
      it("should remove '> ' prefix", () => {
        expect(removeBlockquotePrefix("> Content")).toBe("Content");
      });

      it("should remove '>' without space", () => {
        expect(removeBlockquotePrefix(">Content")).toBe("Content");
      });

      it("should preserve extra whitespace after prefix", () => {
        expect(removeBlockquotePrefix(">   Content with spaces")).toBe("  Content with spaces");
      });

      it("should handle empty blockquote", () => {
        expect(removeBlockquotePrefix(">")).toBe("");
      });

      it("should handle line with just blockquote and space", () => {
        expect(removeBlockquotePrefix("> ")).toBe("");
      });
    });
  });

  // ===========================================
  // PHASE 1: Parsing
  // ===========================================
  describe("Phase 1: Parsing (parseBlocks)", () => {
    describe("basic parsing", () => {
      it("should parse a simple callout", () => {
        const lines = ["> [!note] Title", "> Content line 1", "> Content line 2"];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("callout");

        const callout = blocks[0] as CalloutBlock;
        expect(callout.calloutType).toBe("note");
        expect(callout.title).toBe("Title");
        expect(callout.emoji).toBe("📝");
        expect(callout.content).toEqual(["Content line 1", "Content line 2"]);
      });

      it("should parse callout without title", () => {
        const lines = ["> [!warning]", "> Be careful"];
        const blocks = parseBlocks(lines);

        const callout = blocks[0] as CalloutBlock;
        expect(callout.title).toBe("");
        expect(callout.content).toEqual(["Be careful"]);
      });

      it("should parse text blocks", () => {
        const lines = ["Regular text", "Another line"];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toEqual({ type: "text", line: "Regular text" });
        expect(blocks[1]).toEqual({ type: "text", line: "Another line" });
      });

      it("should parse empty lines as text blocks", () => {
        const lines = ["", ""];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toEqual({ type: "text", line: "" });
        expect(blocks[1]).toEqual({ type: "text", line: "" });
      });
    });

    describe("callout types and emojis", () => {
      it("should map known types to correct emojis", () => {
        const testCases: Array<[string, string]> = [
          ["note", "📝"],
          ["warning", "⚠️"],
          ["error", "❌"],
          ["success", "✅"],
          ["tip", "💡"],
          ["question", "❓"],
        ];

        testCases.forEach(([type, expectedEmoji]) => {
          const lines = [`> [!${type}] Test`];
          const blocks = parseBlocks(lines);
          const callout = blocks[0] as CalloutBlock;

          expect(callout.emoji).toBe(expectedEmoji);
        });
      });

      it("should use default emoji for unknown types", () => {
        const lines = ["> [!custom-unknown-type] Test"];
        const blocks = parseBlocks(lines);
        const callout = blocks[0] as CalloutBlock;

        expect(callout.emoji).toBe("📝"); // Default to note
      });

      it("should handle case-insensitive type matching", () => {
        const lines = ["> [!WARNING] Test", "> Content"];
        const blocks = parseBlocks(lines);
        const callout = blocks[0] as CalloutBlock;

        expect(callout.calloutType).toBe("warning");
        expect(callout.emoji).toBe("⚠️");
      });
    });

    describe("mixed content", () => {
      it("should parse mixed text and callouts", () => {
        const lines = ["Text before", "> [!note] Callout", "> Content", "Text after"];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(3);
        expect(blocks[0]).toEqual({ type: "text", line: "Text before" });
        expect(blocks[1].type).toBe("callout");
        expect(blocks[2]).toEqual({ type: "text", line: "Text after" });
      });

      it("should parse consecutive callouts", () => {
        const lines = ["> [!note] First", "> First content", "> [!warning] Second", "> Second content"];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(2);

        const first = blocks[0] as CalloutBlock;
        expect(first.calloutType).toBe("note");
        expect(first.content).toEqual(["First content"]);

        const second = blocks[1] as CalloutBlock;
        expect(second.calloutType).toBe("warning");
        expect(second.content).toEqual(["Second content"]);
      });

      it("should handle regular blockquotes between callouts", () => {
        // Note: Regular blockquotes that start with ">" immediately after a callout
        // will be consumed as part of the callout content. To separate them,
        // you need a non-blockquote line in between.
        const lines = [
          "> [!note] Callout 1",
          "> Content 1",
          "", // Empty line separates the callout from the blockquote
          "> Regular blockquote",
          "Normal text",
          "> [!warning] Callout 2",
        ];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(5);
        expect(blocks[0].type).toBe("callout");
        expect((blocks[0] as CalloutBlock).content).toEqual(["Content 1"]);
        expect(blocks[1]).toEqual({ type: "text", line: "" });
        expect(blocks[2]).toEqual({ type: "text", line: "> Regular blockquote" });
        expect(blocks[3]).toEqual({ type: "text", line: "Normal text" });
        expect(blocks[4].type).toBe("callout");
      });
    });

    describe("callout content edge cases", () => {
      it("should parse callout with no content", () => {
        const lines = ["> [!note] Title Only"];
        const blocks = parseBlocks(lines);

        const callout = blocks[0] as CalloutBlock;
        expect(callout.content).toEqual([]);
      });

      it("should parse callout with empty content lines", () => {
        const lines = ["> [!note] Title", "> Line 1", ">", "> Line 3"];
        const blocks = parseBlocks(lines);

        const callout = blocks[0] as CalloutBlock;
        expect(callout.content).toEqual(["Line 1", "", "Line 3"]);
      });

      it("should preserve whitespace in content", () => {
        const lines = ["> [!note] Title", ">   Indented content", ">     More indented"];
        const blocks = parseBlocks(lines);

        const callout = blocks[0] as CalloutBlock;
        expect(callout.content).toEqual(["  Indented content", "    More indented"]);
      });

      it("should handle markdown in content", () => {
        const lines = ["> [!note] Title", "> **Bold** and *italic*", "> - List item", "> `code`"];
        const blocks = parseBlocks(lines);

        const callout = blocks[0] as CalloutBlock;
        expect(callout.content).toEqual(["**Bold** and *italic*", "- List item", "`code`"]);
      });
    });

    describe("edge cases", () => {
      it("should handle empty input", () => {
        const blocks = parseBlocks([]);
        expect(blocks).toEqual([]);
      });

      it("should handle input with only whitespace", () => {
        const lines = ["   ", "\t", ""];
        const blocks = parseBlocks(lines);

        expect(blocks).toHaveLength(3);
        blocks.forEach((block) => expect(block.type).toBe("text"));
      });
    });
  });

  // ===========================================
  // PHASE 2: Rendering
  // ===========================================
  describe("Phase 2: Rendering", () => {
    describe("renderCalloutBlock", () => {
      it("should render callout with title and content", () => {
        const callout: CalloutBlock = {
          type: "callout",
          calloutType: "note",
          title: "Important",
          emoji: "📝",
          content: ["Line 1", "Line 2"],
        };

        const result = renderCalloutBlock(callout);

        expect(result).toEqual(["> 📝 **Important**", ">", "> Line 1", "> Line 2"]);
      });

      it("should render callout without title", () => {
        const callout: CalloutBlock = {
          type: "callout",
          calloutType: "warning",
          title: "",
          emoji: "⚠️",
          content: ["Be careful"],
        };

        const result = renderCalloutBlock(callout);

        expect(result).toEqual(["> ⚠️", ">", "> Be careful"]);
      });

      it("should render callout with no content", () => {
        const callout: CalloutBlock = {
          type: "callout",
          calloutType: "note",
          title: "Title Only",
          emoji: "📝",
          content: [],
        };

        const result = renderCalloutBlock(callout);

        expect(result).toEqual(["> 📝 **Title Only**", ">"]);
      });

      it("should render empty content lines without trailing space", () => {
        const callout: CalloutBlock = {
          type: "callout",
          calloutType: "note",
          title: "Test",
          emoji: "📝",
          content: ["Line 1", "", "Line 3"],
        };

        const result = renderCalloutBlock(callout);

        expect(result).toEqual(["> 📝 **Test**", ">", "> Line 1", ">", "> Line 3"]);
      });

      it("should preserve content whitespace", () => {
        const callout: CalloutBlock = {
          type: "callout",
          calloutType: "note",
          title: "Test",
          emoji: "📝",
          content: ["  Indented", "    More indented"],
        };

        const result = renderCalloutBlock(callout);

        expect(result).toEqual(["> 📝 **Test**", ">", ">   Indented", ">     More indented"]);
      });
    });

    describe("renderBlocks - spacing logic", () => {
      it("should add spacing before callout after text", () => {
        const blocks: Block[] = [
          { type: "text", line: "Text before" },
          {
            type: "callout",
            calloutType: "note",
            title: "Title",
            emoji: "📝",
            content: ["Content"],
          },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe(`Text before

> 📝 **Title**
>
> Content
`);
      });

      it("should add spacing after callout before text", () => {
        const blocks: Block[] = [
          {
            type: "callout",
            calloutType: "note",
            title: "Title",
            emoji: "📝",
            content: ["Content"],
          },
          { type: "text", line: "Text after" },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe(`
> 📝 **Title**
>
> Content

Text after`);
      });

      it("should NOT add spacing between consecutive callouts", () => {
        const blocks: Block[] = [
          {
            type: "callout",
            calloutType: "note",
            title: "First",
            emoji: "📝",
            content: ["Content 1"],
          },
          {
            type: "callout",
            calloutType: "warning",
            title: "Second",
            emoji: "⚠️",
            content: ["Content 2"],
          },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe(`
> 📝 **First**
>
> Content 1
> ⚠️ **Second**
>
> Content 2
`);
      });

      it("should NOT add spacing between text blocks", () => {
        const blocks: Block[] = [
          { type: "text", line: "Line 1" },
          { type: "text", line: "Line 2" },
          { type: "text", line: "Line 3" },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe("Line 1\nLine 2\nLine 3");
      });

      it("should handle complex mixed content", () => {
        const blocks: Block[] = [
          { type: "text", line: "Before" },
          {
            type: "callout",
            calloutType: "note",
            title: "First",
            emoji: "📝",
            content: ["Content 1"],
          },
          {
            type: "callout",
            calloutType: "warning",
            title: "Second",
            emoji: "⚠️",
            content: ["Content 2"],
          },
          { type: "text", line: "Middle" },
          {
            type: "callout",
            calloutType: "success",
            title: "Third",
            emoji: "✅",
            content: ["Content 3"],
          },
          { type: "text", line: "After" },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe(`Before

> 📝 **First**
>
> Content 1
> ⚠️ **Second**
>
> Content 2

Middle

> ✅ **Third**
>
> Content 3

After`);
      });
    });

    describe("renderBlocks - edge cases", () => {
      it("should handle empty blocks array", () => {
        const result = renderBlocks([]);
        expect(result).toBe("");
      });

      it("should handle single text block", () => {
        const blocks: Block[] = [{ type: "text", line: "Single line" }];
        const result = renderBlocks(blocks);
        expect(result).toBe("Single line");
      });

      it("should handle single callout block", () => {
        const blocks: Block[] = [
          {
            type: "callout",
            calloutType: "note",
            title: "Solo",
            emoji: "📝",
            content: ["Content"],
          },
        ];

        const result = renderBlocks(blocks);

        expect(result).toBe(`
> 📝 **Solo**
>
> Content
`);
      });
    });
  });

  // ===========================================
  // END-TO-END: Integration Tests
  // ===========================================
  describe("End-to-End Integration", () => {
    it("should correctly process simple callout", () => {
      const input = `> [!note] Important
> This is content`;

      const expected = `
> 📝 **Important**
>
> This is content
`;

      expect(renderCallouts(input)).toBe(expected);
    });

    it("should handle multiple callouts with text", () => {
      const input = `Text before
> [!note] First
> First content
Text between
> [!warning] Second
> Second content
Text after`;

      const expected = `Text before

> 📝 **First**
>
> First content

Text between

> ⚠️ **Second**
>
> Second content

Text after`;

      expect(renderCallouts(input)).toBe(expected);
    });

    it("should handle consecutive callouts", () => {
      const input = `> [!note] First
> First content
> [!warning] Second
> Second content`;

      const expected = `
> 📝 **First**
>
> First content
> ⚠️ **Second**
>
> Second content
`;

      expect(renderCallouts(input)).toBe(expected);
    });

    it("should handle empty input", () => {
      expect(renderCallouts("")).toBe("");
    });

    it("should handle text without callouts", () => {
      const input = `Just regular text
Another line
> A regular blockquote`;

      expect(renderCallouts(input)).toBe(input);
    });

    it("should preserve markdown in callout content", () => {
      const input = `> [!note] Formatting
> **Bold** and *italic*
> - List item
> \`code\``;

      const expected = `
> 📝 **Formatting**
>
> **Bold** and *italic*
> - List item
> \`code\`
`;

      expect(renderCallouts(input)).toBe(expected);
    });

    it("should handle all emoji types", () => {
      const types = [
        "note",
        "warning",
        "error",
        "success",
        "tip",
        "question",
        "info",
        "todo",
        "bug",
        "example",
        "quote",
      ];

      types.forEach((type) => {
        const input = `> [!${type}] Test`;
        const result = renderCallouts(input);

        // Just verify it doesn't crash and produces output
        expect(result).toContain(">");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================
  // PHASE ISOLATION: Verify Independence
  // ===========================================
  describe("Phase Isolation Tests", () => {
    it("parsing and rendering should be inverse operations for simple case", () => {
      const input = `> [!note] Test
> Content`;

      // Parse
      const lines = input.split("\n");
      const blocks = parseBlocks(lines);

      // Render
      const output = renderBlocks(blocks);

      // Should produce equivalent output (with normalized spacing)
      expect(output).toContain("> 📝 **Test**");
      expect(output).toContain("> Content");
    });

    it("should be able to modify blocks between phases", () => {
      const input = `> [!note] Original
> Content`;

      // Parse
      const blocks = parseBlocks(input.split("\n"));

      // Modify the parsed blocks
      const callout = blocks[0] as CalloutBlock;
      callout.title = "Modified";
      callout.content = ["New content"];

      // Render modified blocks
      const output = renderBlocks(blocks);

      expect(output).toContain("**Modified**");
      expect(output).toContain("> New content");
      expect(output).not.toContain("Original");
    });

    it("should allow filtering blocks before rendering", () => {
      const input = `Text before
> [!note] Note
> Content
Text after
> [!warning] Warning
> Content`;

      // Parse
      const blocks = parseBlocks(input.split("\n"));

      // Filter to only callouts
      const onlyCallouts = blocks.filter((b) => b.type === "callout");

      // Render
      const output = renderBlocks(onlyCallouts);

      expect(output).toContain("📝");
      expect(output).toContain("⚠️");
      expect(output).not.toContain("Text before");
      expect(output).not.toContain("Text after");
    });
  });
});
