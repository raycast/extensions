import { describe, it, expect } from "vitest";
import { transformCase, getCaseStyleLabel, CASE_STYLES } from "../lib/case-transform";
import { CaseStyle } from "../types/enums";

describe("transformCase", () => {
  describe("unchanged", () => {
    it("should return input unchanged", () => {
      expect(transformCase("Hello World", CaseStyle.UNCHANGED)).toBe("Hello World");
      expect(transformCase("test_file-name", CaseStyle.UNCHANGED)).toBe("test_file-name");
    });

    it("should handle empty string", () => {
      expect(transformCase("", CaseStyle.UNCHANGED)).toBe("");
    });
  });

  describe("uppercase", () => {
    it("should convert to uppercase", () => {
      expect(transformCase("hello world", CaseStyle.UPPERCASE)).toBe("HELLO WORLD");
      expect(transformCase("Test File", CaseStyle.UPPERCASE)).toBe("TEST FILE");
    });

    it("should handle mixed case", () => {
      expect(transformCase("HeLLo WoRLd", CaseStyle.UPPERCASE)).toBe("HELLO WORLD");
    });
  });

  describe("lowercase", () => {
    it("should convert to lowercase", () => {
      expect(transformCase("HELLO WORLD", CaseStyle.LOWERCASE)).toBe("hello world");
      expect(transformCase("Test File", CaseStyle.LOWERCASE)).toBe("test file");
    });
  });

  describe("titleCase", () => {
    it("should capitalize first letter of each word", () => {
      expect(transformCase("hello world", CaseStyle.TITLE_CASE)).toBe("Hello World");
      expect(transformCase("the quick brown fox", CaseStyle.TITLE_CASE)).toBe("The Quick Brown Fox");
    });

    it("should normalize already capitalized words", () => {
      expect(transformCase("HELLO WORLD", CaseStyle.TITLE_CASE)).toBe("Hello World");
    });
  });

  describe("sentenceCase", () => {
    it("should capitalize only first letter", () => {
      expect(transformCase("hello world", CaseStyle.SENTENCE_CASE)).toBe("Hello world");
      expect(transformCase("THE QUICK BROWN FOX", CaseStyle.SENTENCE_CASE)).toBe("The quick brown fox");
    });

    it("should handle single character", () => {
      expect(transformCase("a", CaseStyle.SENTENCE_CASE)).toBe("A");
    });
  });

  describe("camelCase", () => {
    it("should convert to camelCase", () => {
      expect(transformCase("hello world", CaseStyle.CAMEL_CASE)).toBe("helloWorld");
      expect(transformCase("the_quick_brown_fox", CaseStyle.CAMEL_CASE)).toBe("theQuickBrownFox");
    });

    it("should handle kebab-case input", () => {
      expect(transformCase("my-file-name", CaseStyle.CAMEL_CASE)).toBe("myFileName");
    });

    it("should handle PascalCase input", () => {
      expect(transformCase("MyFileName", CaseStyle.CAMEL_CASE)).toBe("myFileName");
    });

    it("should handle mixed separators", () => {
      expect(transformCase("my_file-name", CaseStyle.CAMEL_CASE)).toBe("myFileName");
    });
  });

  describe("pascalCase", () => {
    it("should convert to PascalCase", () => {
      expect(transformCase("hello world", CaseStyle.PASCAL_CASE)).toBe("HelloWorld");
      expect(transformCase("the_quick_brown_fox", CaseStyle.PASCAL_CASE)).toBe("TheQuickBrownFox");
    });

    it("should handle camelCase input", () => {
      expect(transformCase("myFileName", CaseStyle.PASCAL_CASE)).toBe("MyFileName");
    });
  });

  describe("snakeCase", () => {
    it("should convert to snake_case", () => {
      expect(transformCase("hello world", CaseStyle.SNAKE_CASE)).toBe("hello_world");
      expect(transformCase("HelloWorld", CaseStyle.SNAKE_CASE)).toBe("hello_world");
    });

    it("should handle kebab-case input", () => {
      expect(transformCase("my-file-name", CaseStyle.SNAKE_CASE)).toBe("my_file_name");
    });

    it("should handle camelCase input", () => {
      expect(transformCase("myFileName", CaseStyle.SNAKE_CASE)).toBe("my_file_name");
    });
  });

  describe("kebabCase", () => {
    it("should convert to kebab-case", () => {
      expect(transformCase("hello world", CaseStyle.KEBAB_CASE)).toBe("hello-world");
      expect(transformCase("HelloWorld", CaseStyle.KEBAB_CASE)).toBe("hello-world");
    });

    it("should handle snake_case input", () => {
      expect(transformCase("my_file_name", CaseStyle.KEBAB_CASE)).toBe("my-file-name");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string for all styles", () => {
      const styles: CaseStyle[] = [
        CaseStyle.UPPERCASE,
        CaseStyle.LOWERCASE,
        CaseStyle.TITLE_CASE,
        CaseStyle.SENTENCE_CASE,
        CaseStyle.CAMEL_CASE,
        CaseStyle.PASCAL_CASE,
        CaseStyle.SNAKE_CASE,
        CaseStyle.KEBAB_CASE,
      ];
      for (const style of styles) {
        expect(transformCase("", style)).toBe("");
      }
    });

    it("should handle single word", () => {
      expect(transformCase("hello", CaseStyle.CAMEL_CASE)).toBe("hello");
      expect(transformCase("hello", CaseStyle.PASCAL_CASE)).toBe("Hello");
      expect(transformCase("hello", CaseStyle.SNAKE_CASE)).toBe("hello");
    });

    it("should handle numbers", () => {
      expect(transformCase("file1", CaseStyle.CAMEL_CASE)).toBe("file1");
      expect(transformCase("file_1_name", CaseStyle.CAMEL_CASE)).toBe("file1Name");
    });

    it("should handle unicode characters", () => {
      expect(transformCase("héllo wörld", CaseStyle.UPPERCASE)).toBe("HÉLLO WÖRLD");
      expect(transformCase("HÉLLO WÖRLD", CaseStyle.LOWERCASE)).toBe("héllo wörld");
    });

    it("should handle special characters", () => {
      expect(transformCase("file@#$name", CaseStyle.SNAKE_CASE)).toBe("file_name");
      expect(transformCase("my...file", CaseStyle.KEBAB_CASE)).toBe("my-file");
    });
  });
});

describe("getCaseStyleLabel", () => {
  it("should return correct labels for all styles", () => {
    expect(getCaseStyleLabel(CaseStyle.UNCHANGED)).toBe("Unchanged");
    expect(getCaseStyleLabel(CaseStyle.UPPERCASE)).toBe("UPPERCASE");
    expect(getCaseStyleLabel(CaseStyle.LOWERCASE)).toBe("lowercase");
    expect(getCaseStyleLabel(CaseStyle.TITLE_CASE)).toBe("Title Case");
    expect(getCaseStyleLabel(CaseStyle.SENTENCE_CASE)).toBe("Sentence case");
    expect(getCaseStyleLabel(CaseStyle.CAMEL_CASE)).toBe("camelCase");
    expect(getCaseStyleLabel(CaseStyle.PASCAL_CASE)).toBe("PascalCase");
    expect(getCaseStyleLabel(CaseStyle.SNAKE_CASE)).toBe("snake_case");
    expect(getCaseStyleLabel(CaseStyle.KEBAB_CASE)).toBe("kebab-case");
  });
});

describe("CASE_STYLES", () => {
  it("should contain all 9 case styles", () => {
    expect(CASE_STYLES).toHaveLength(9);
    expect(CASE_STYLES).toContain(CaseStyle.UNCHANGED);
    expect(CASE_STYLES).toContain(CaseStyle.UPPERCASE);
    expect(CASE_STYLES).toContain(CaseStyle.LOWERCASE);
    expect(CASE_STYLES).toContain(CaseStyle.TITLE_CASE);
    expect(CASE_STYLES).toContain(CaseStyle.SENTENCE_CASE);
    expect(CASE_STYLES).toContain(CaseStyle.CAMEL_CASE);
    expect(CASE_STYLES).toContain(CaseStyle.PASCAL_CASE);
    expect(CASE_STYLES).toContain(CaseStyle.SNAKE_CASE);
    expect(CASE_STYLES).toContain(CaseStyle.KEBAB_CASE);
  });
});
