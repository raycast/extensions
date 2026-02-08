import { splitIntoWords } from "../string-utils";

describe("splitIntoWords", () => {
  describe("camelCase splitting", () => {
    it("should split camelCase into words", () => {
      expect(splitIntoWords("helloWorld")).toEqual(["hello", "World"]);
    });

    it("should split multiple camelCase words", () => {
      expect(splitIntoWords("helloWorldTest")).toEqual(["hello", "World", "Test"]);
    });

    it("should handle lowercase word at start", () => {
      expect(splitIntoWords("myVariableName")).toEqual(["my", "Variable", "Name"]);
    });
  });

  describe("PascalCase splitting", () => {
    it("should split PascalCase into words", () => {
      expect(splitIntoWords("HelloWorld")).toEqual(["Hello", "World"]);
    });

    it("should split multiple PascalCase words", () => {
      expect(splitIntoWords("HelloWorldTest")).toEqual(["Hello", "World", "Test"]);
    });

    it("should handle single uppercase word", () => {
      expect(splitIntoWords("Hello")).toEqual(["Hello"]);
    });
  });

  describe("snake_case splitting", () => {
    it("should split snake_case into words", () => {
      expect(splitIntoWords("hello_world")).toEqual(["hello", "world"]);
    });

    it("should split multiple snake_case words", () => {
      expect(splitIntoWords("hello_world_test")).toEqual(["hello", "world", "test"]);
    });

    it("should handle SNAKE_UPPER_CASE", () => {
      expect(splitIntoWords("HELLO_WORLD")).toEqual(["HELLO", "WORLD"]);
    });

    it("should handle multiple underscores", () => {
      expect(splitIntoWords("hello__world")).toEqual(["hello", "world"]);
    });
  });

  describe("kebab-case splitting", () => {
    it("should split kebab-case into words", () => {
      expect(splitIntoWords("hello-world")).toEqual(["hello", "world"]);
    });

    it("should split multiple kebab-case words", () => {
      expect(splitIntoWords("hello-world-test")).toEqual(["hello", "world", "test"]);
    });

    it("should handle multiple hyphens", () => {
      expect(splitIntoWords("hello--world")).toEqual(["hello", "world"]);
    });
  });

  describe("space-separated splitting", () => {
    it("should split space-separated words", () => {
      expect(splitIntoWords("hello world")).toEqual(["hello", "world"]);
    });

    it("should split multiple space-separated words", () => {
      expect(splitIntoWords("hello world test")).toEqual(["hello", "world", "test"]);
    });

    it("should handle multiple spaces", () => {
      expect(splitIntoWords("hello   world")).toEqual(["hello", "world"]);
    });

    it("should handle leading and trailing spaces", () => {
      expect(splitIntoWords("  hello world  ")).toEqual(["hello", "world"]);
    });
  });

  describe("mixed format splitting", () => {
    it("should handle camelCase with underscores", () => {
      expect(splitIntoWords("hello_worldTest")).toEqual(["hello", "world", "Test"]);
    });

    it("should handle camelCase with hyphens", () => {
      expect(splitIntoWords("hello-worldTest")).toEqual(["hello", "world", "Test"]);
    });

    it("should handle snake_case with spaces", () => {
      expect(splitIntoWords("hello_world test")).toEqual(["hello", "world", "test"]);
    });

    it("should handle kebab-case with spaces", () => {
      expect(splitIntoWords("hello-world test")).toEqual(["hello", "world", "test"]);
    });

    it("should handle mixed underscores, hyphens, and spaces", () => {
      expect(splitIntoWords("hello_world-test foo")).toEqual(["hello", "world", "test", "foo"]);
    });

    it("should handle camelCase with snake_case and kebab-case", () => {
      expect(splitIntoWords("helloWorld_test-case")).toEqual(["hello", "World", "test", "case"]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(splitIntoWords("")).toEqual([]);
    });

    it("should handle single word", () => {
      expect(splitIntoWords("hello")).toEqual(["hello"]);
    });

    it("should handle single uppercase letter", () => {
      expect(splitIntoWords("A")).toEqual(["A"]);
    });

    it("should handle single lowercase letter", () => {
      expect(splitIntoWords("a")).toEqual(["a"]);
    });

    it("should handle only underscores", () => {
      expect(splitIntoWords("___")).toEqual([]);
    });

    it("should handle only hyphens", () => {
      expect(splitIntoWords("---")).toEqual([]);
    });

    it("should handle only spaces", () => {
      expect(splitIntoWords("   ")).toEqual([]);
    });

    it("should handle numbers with text", () => {
      expect(splitIntoWords("hello123world")).toEqual(["hello123world"]);
    });

    it("should handle snake_case with numbers", () => {
      expect(splitIntoWords("hello_123_world")).toEqual(["hello", "123", "world"]);
    });

    it("should handle consecutive uppercase letters", () => {
      expect(splitIntoWords("HTTPRequest")).toEqual(["HTTPRequest"]);
    });

    it("should handle uppercase followed by lowercase", () => {
      expect(splitIntoWords("XMLParser")).toEqual(["XMLParser"]);
    });
  });

  describe("special characters", () => {
    it("should preserve special characters within words", () => {
      expect(splitIntoWords("hello@world")).toEqual(["hello@world"]);
    });

    it("should handle exclamation marks", () => {
      expect(splitIntoWords("hello!world")).toEqual(["hello!world"]);
    });

    it("should handle periods", () => {
      expect(splitIntoWords("hello.world")).toEqual(["hello.world"]);
    });
  });
});
