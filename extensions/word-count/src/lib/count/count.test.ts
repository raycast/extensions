import { count } from "./count";

describe("count function", () => {
  // Empty strings
  test("should handle empty strings", () => {
    const result = count("", true);
    expect(result.words).toBe(0);
    expect(result.characters).toBe(0);
    expect(result.paragraphs).toBe(0);
    expect(result.sentences).toBe(0);
  });

  test("should handle whitespace only strings", () => {
    const result = count("   \n\t   ", true);
    expect(result.words).toBe(0);
    expect(result.paragraphs).toBe(0);
  });

  // Non-CJK text (English/Latin)
  test("should count words correctly in English text", () => {
    const result = count("This is a simple English sentence.", true);
    expect(result.words).toBe(6);
  });

  test("should handle punctuation in English text", () => {
    const result = count("Hello, world! How are you today?", true);
    expect(result.words).toBe(6);
  });

  test("should handle multiple spaces and line breaks in English", () => {
    const result = count("First line.\n\nSecond  line with  extra spaces.", true);
    expect(result.words).toBe(7);
    expect(result.paragraphs).toBe(2);
  });

  // CJK text
  test("should count each CJK character as a word in Chinese text", () => {
    const result = count("你好世界", true);
    expect(result.words).toBe(4); // Each character counts as a word
  });

  test("should count each CJK character as a word in Japanese text", () => {
    const result = count("こんにちは世界", true);
    expect(result.words).toBe(7); // Each character counts as a word
  });

  test("should count each CJK character as a word in Korean text", () => {
    const result = count("안녕하세요", true);
    expect(result.words).toBe(5); // Each character counts as a word
  });

  test("should handle CJK text with punctuation", () => {
    const result = count("你好，世界！", true);
    expect(result.words).toBe(4); // Only counting the CJK characters
  });

  // Mixed CJK and non-CJK
  test("should handle mixed English and CJK text", () => {
    const result = count("Hello 你好 world 世界", true);
    expect(result.words).toBe(6); // "Hello" (1) + "你好" (2) + "world" (1) + "世界" (2)
  });

  test("should handle CJK text embedded in English words", () => {
    const result = count("pre你好post", true);
    expect(result.words).toBe(4); // "pre" (1) + "你好" (2) + "post" (1)
  });

  // Complex and edge cases
  test("should handle mixed scripts with punctuation", () => {
    const result = count("English, 中文, and 한국어! How about ひらがな?", true);
    // "English" (1) + "中文" (2) + "and" (1) + "한국어" (3) + "How" (1) + "about" (1) + "ひらがな" (4)
    expect(result.words).toBe(13);
  });

  test("should handle very long text with mixed content", () => {
    const longText =
      "This is a longer text with some CJK characters like 你好世界 mixed in. " +
      "It contains multiple sentences. 句子里混合了英文和中文。This tests performance and accuracy.";
    const result = count(longText, true);
    // According to current implementation:
    // 21 English words + 15 CJK characters (你好世界句子里混合了英文和中文)
    expect(result.words).toBe(36);
  });

  // Other ICountResult properties
  test("should calculate reading and speaking time", () => {
    const result = count(
      "This is a test with 28 words. This is a test with 28 words. This is a test with 28 words. This is a test with 28 words.",
      true
    );
    expect(result.words).toBe(28);
    expect(result.reading_time).toBe(Math.ceil(28 / 275));
    expect(result.speaking_time).toBe(Math.ceil(28 / 180));
  });

  test("should count characters correctly with includeWhitespace=true", () => {
    const text = "Hello world";
    const result = count(text, true);
    expect(result.characters).toBe(11); // Including space
  });

  test("should count characters correctly with includeWhitespace=false", () => {
    const text = "Hello world";
    const result = count(text, false);
    expect(result.characters).toBe(10); // Excluding space
  });

  test("should count sentences correctly", () => {
    const text = "This is sentence one. This is sentence two! Is this sentence three? Yes, it is.";
    const result = count(text, true);
    expect(result.sentences).toBe(4);
  });
});
