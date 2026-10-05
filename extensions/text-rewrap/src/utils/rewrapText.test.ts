import { describe, it, expect } from "vitest";
import { rewrapText, rewrapParagraphs } from "./rewrapText";

describe("rewrapParagraphs", () => {
  it("should wrap text at specified width", () => {
    const test_input = "blah blah blah";
    const expected_result = "blah\nblah\nblah";

    const result = rewrapParagraphs(test_input, 5);

    expect(result).toBe(expected_result);
  });

  it("should not wrap long lines of one word", () => {
    const test_input = "thisisaverylongword";

    const result = rewrapParagraphs(test_input, 5);

    expect(result).toBe(test_input);
  });

  it("should respect paragraphs", () => {
    const test_input = "first paragraph. this will be split across many lines.\n\nsecond paragraph";
    const expected_result = "first paragraph. this will be\nsplit across many lines.\n\nsecond paragraph";

    const result = rewrapParagraphs(test_input, 30);

    expect(result).toBe(expected_result);
  });

  it("should do nothing on empty input", () => {
    const test_input = "";
    const expected_result = "";

    const result = rewrapParagraphs(test_input, 5);

    expect(result).toBe(expected_result);
  });

  it("should unwrap if width allows everything to fit on one line", () => {
    const test_input = "a\nb\nc\nd";
    const expected_result = "a b c d";

    const result = rewrapText(test_input, 100);

    expect(result).toBe(expected_result);
  });

  it("should unwrap if width is not provided", () => {
    const test_input = "a\nb\nc\nd";
    const expected_result = "a b c d";

    const result = rewrapText(test_input, undefined);

    expect(result).toBe(expected_result);
  });

  it("should handle width of 0 by returning original text", () => {
    const test_input = "some text here\nmore text here";

    const result = rewrapText(test_input, 0);

    expect(result).toBe(test_input);
  });

  it("should handle negative width by returning original text", () => {
    const test_input = "some text here";

    const result = rewrapText(test_input, -10);

    expect(result).toBe(test_input);
  });

  it("should handle width of 1", () => {
    const test_input = "a b c";
    const expected_result = "a\nb\nc";

    const result = rewrapParagraphs(test_input, 1);

    expect(result).toBe(expected_result);
  });

  it("should handle text with only whitespace", () => {
    const test_input = "   \n  \n   ";
    const expected_result = "";

    const result = rewrapParagraphs(test_input, 10);

    expect(result).toBe(expected_result);
  });

  it("should normalize multiple consecutive spaces", () => {
    const test_input = "word1    word2     word3";
    const expected_result = "word1 word2 word3";

    const result = rewrapParagraphs(test_input, 100);

    expect(result).toBe(expected_result);
  });

  it("should handle 3+ paragraphs", () => {
    const test_input = "first\n\nsecond\n\nthird\n\nfourth";
    const expected_result = "first\n\nsecond\n\nthird\n\nfourth";

    const result = rewrapParagraphs(test_input, 100);

    expect(result).toBe(expected_result);
  });

  it("should handle paragraphs separated by more than 2 newlines", () => {
    const test_input = "first paragraph\n\n\n\nsecond paragraph";
    const expected_result = "first paragraph\n\nsecond paragraph";

    const result = rewrapParagraphs(test_input, 100);

    expect(result).toBe(expected_result);
  });

  it("should handle trailing and leading newlines", () => {
    const test_input = "\n\nsome text here\n\n";
    const expected_result = "some text here";

    const result = rewrapParagraphs(test_input, 100);

    expect(result).toBe(expected_result);
  });

  it("should handle word length equal to width", () => {
    const test_input = "hello world";
    const expected_result = "hello\nworld";

    const result = rewrapParagraphs(test_input, 5);

    expect(result).toBe(expected_result);
  });

  it("should handle punctuation and special characters", () => {
    const test_input = "Hello, world! How are you? I'm fine.";
    const expected_result = "Hello, world!\nHow are you?\nI'm fine.";

    const result = rewrapParagraphs(test_input, 15);

    expect(result).toBe(expected_result);
  });

  it("should be idempotent when rewrapping already-wrapped text", () => {
    const test_input = "first line\nsecond line\nthird line";

    const result1 = rewrapParagraphs(test_input, 20);
    const result2 = rewrapParagraphs(result1, 20);

    expect(result1).toBe(result2);
  });

  it("should handle unicode characters", () => {
    const test_input = "hello 👋 world 🌍 test";
    const expected_result = "hello 👋\nworld 🌍\ntest";

    const result = rewrapParagraphs(test_input, 10);

    expect(result).toBe(expected_result);
  });

  it("should handle accented characters", () => {
    const test_input = "café résumé naïve";
    const expected_result = "café\nrésumé\nnaïve";

    const result = rewrapParagraphs(test_input, 6);

    expect(result).toBe(expected_result);
  });

  it("should handle very large width values", () => {
    const test_input = "word1\nword2\nword3\nword4";
    const expected_result = "word1 word2 word3 word4";

    const result = rewrapParagraphs(test_input, 10000);

    expect(result).toBe(expected_result);
  });

  it("should handle mixed whitespace between paragraphs", () => {
    const test_input = "first paragraph\n \n \t\n  \nsecond paragraph";
    const expected_result = "first paragraph\n\nsecond paragraph";

    const result = rewrapParagraphs(test_input, 100);

    expect(result).toBe(expected_result);
  });
});
