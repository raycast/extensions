import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fillPromptBody,
  fillPromptForPaste,
  hasPlaceholders,
  countPlaceholders,
  SUPPORTED_PLACEHOLDERS,
} from "../placeholder";
import { Clipboard } from "@raycast/api";

describe("placeholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fillPromptBody", () => {
    it("should return template as-is when no placeholders", async () => {
      const result = await fillPromptBody("Hello World");
      expect(result).toBe("Hello World");
    });

    it("should replace {clipboard} with provided text", async () => {
      const result = await fillPromptBody("Hello {clipboard}!", {
        clipboardText: "World",
      });
      expect(result).toBe("Hello World!");
    });

    it("should replace multiple {clipboard} occurrences", async () => {
      const result = await fillPromptBody("{clipboard} and {clipboard}", {
        clipboardText: "test",
      });
      expect(result).toBe("test and test");
    });

    it("should read from actual clipboard when no clipboardText provided", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("ClipboardValue");

      const result = await fillPromptBody("Content: {clipboard}");
      expect(result).toBe("Content: ClipboardValue");
      expect(Clipboard.readText).toHaveBeenCalledOnce();
    });

    it("should handle empty clipboard", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("");

      const result = await fillPromptBody("Content: {clipboard}");
      expect(result).toBe("Content: ");
    });

    it("should handle null clipboard", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue(null);

      const result = await fillPromptBody("Content: {clipboard}");
      expect(result).toBe("Content: ");
    });

    it("should remove {cursor} placeholder", async () => {
      const result = await fillPromptBody("Start {cursor} End");
      expect(result).toBe("Start  End");
    });

    it("should handle both {clipboard} and {cursor}", async () => {
      const result = await fillPromptBody(
        "Hello {clipboard}! {cursor} Goodbye",
        {
          clipboardText: "World",
        },
      );
      expect(result).toBe("Hello World!  Goodbye");
    });

    it("should handle multiline templates", async () => {
      const template = `Line 1: {clipboard}
Line 2: Content
{cursor}
Line 3: End`;

      const result = await fillPromptBody(template, { clipboardText: "TEST" });
      expect(result).toBe(`Line 1: TEST
Line 2: Content

Line 3: End`);
    });
  });

  describe("fillPromptForPaste", () => {
    it("should return text and null cursorOffset when no {cursor}", async () => {
      const result = await fillPromptForPaste("Hello World");
      expect(result).toEqual({
        text: "Hello World",
        cursorOffset: null,
      });
    });

    it("should calculate correct cursorOffset for {cursor} at end", async () => {
      const result = await fillPromptForPaste("Hello World {cursor}");
      expect(result).toEqual({
        text: "Hello World ",
        cursorOffset: 0,
      });
    });

    it("should calculate correct cursorOffset for {cursor} in middle", async () => {
      const result = await fillPromptForPaste("Hello {cursor} World");
      expect(result).toEqual({
        text: "Hello  World",
        cursorOffset: 6, // " World" = 6 characters
      });
    });

    it("should calculate correct cursorOffset for {cursor} at start", async () => {
      const result = await fillPromptForPaste("{cursor} Hello World");
      expect(result).toEqual({
        text: " Hello World",
        cursorOffset: 12, // " Hello World" = 12 characters
      });
    });

    it("should handle {clipboard} and {cursor} together", async () => {
      const result = await fillPromptForPaste(
        "Text: {clipboard} {cursor} End",
        {
          clipboardText: "VALUE",
        },
      );
      expect(result).toEqual({
        text: "Text: VALUE  End",
        cursorOffset: 4, // " End" = 4 characters
      });
    });

    it("should handle multiline with {cursor}", async () => {
      const template = `Line 1
{cursor}
Line 3`;

      const result = await fillPromptForPaste(template);
      expect(result.text).toBe(`Line 1

Line 3`);
      expect(result.cursorOffset).toBe(7); // "\nLine 3" = 7 characters
    });
  });

  describe("hasPlaceholders", () => {
    it("should return true for {clipboard}", () => {
      expect(hasPlaceholders("Text {clipboard}")).toBe(true);
    });

    it("should return true for {cursor}", () => {
      expect(hasPlaceholders("Text {cursor}")).toBe(true);
    });

    it("should return true for both placeholders", () => {
      expect(hasPlaceholders("{clipboard} and {cursor}")).toBe(true);
    });

    it("should return false for no placeholders", () => {
      expect(hasPlaceholders("Plain text")).toBe(false);
    });

    it("should return false for similar but different text", () => {
      expect(hasPlaceholders("clipboard and cursor")).toBe(false);
      expect(hasPlaceholders("{something}")).toBe(false);
    });
  });

  describe("countPlaceholders", () => {
    it("should count no placeholders", () => {
      expect(countPlaceholders("Plain text")).toEqual({
        clipboard: 0,
        cursor: 0,
      });
    });

    it("should count single {clipboard}", () => {
      expect(countPlaceholders("Text {clipboard}")).toEqual({
        clipboard: 1,
        cursor: 0,
      });
    });

    it("should count multiple {clipboard}", () => {
      expect(countPlaceholders("{clipboard} and {clipboard}")).toEqual({
        clipboard: 2,
        cursor: 0,
      });
    });

    it("should count single {cursor}", () => {
      expect(countPlaceholders("Text {cursor}")).toEqual({
        clipboard: 0,
        cursor: 1,
      });
    });

    it("should count both placeholders", () => {
      expect(countPlaceholders("{clipboard} {cursor} {clipboard}")).toEqual({
        clipboard: 2,
        cursor: 1,
      });
    });
  });

  describe("SUPPORTED_PLACEHOLDERS", () => {
    it("should define clipboard placeholder", () => {
      const clipboard = SUPPORTED_PLACEHOLDERS.find(
        (p) => p.name === "clipboard",
      );
      expect(clipboard).toBeDefined();
      expect(clipboard?.syntax).toBe("{clipboard}");
      expect(clipboard?.description).toContain("クリップボード");
    });

    it("should define cursor placeholder", () => {
      const cursor = SUPPORTED_PLACEHOLDERS.find((p) => p.name === "cursor");
      expect(cursor).toBeDefined();
      expect(cursor?.syntax).toBe("{cursor}");
      expect(cursor?.description).toContain("カーソル");
    });

    it("should have exactly 2 placeholders", () => {
      expect(SUPPORTED_PLACEHOLDERS).toHaveLength(2);
    });
  });
});
