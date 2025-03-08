import { NudgeConverter } from "@/utils/nudgeConverter";

describe("NudgeConverter", () => {
  describe("jsonToJsObject", () => {
    it("should convert JSON to JS object format", () => {
      const input = '{"name": "John", "age": 30}';
      const result = NudgeConverter.jsonToJsObject(input);
      expect(result).toContain('name: "John"');
      expect(result).toContain("age: 30");
    });

    it("should convert nested objects correctly", () => {
      const input = '{"user":{"name":"John","age":30}}';
      const expected = '{ user: { name: "John", age: 30 } }';
      expect(NudgeConverter.jsonToJsObject(input)).toBe(expected);
    });

    it("should convert arrays with mixed types correctly", () => {
      const input = '{"items":[1,"two",null,{"x":1}]}';
      const expected = '{ items: [1, "two", null, { x: 1 }] }';
      expect(NudgeConverter.jsonToJsObject(input)).toBe(expected);
    });

    it("should handle special characters correctly", () => {
      const input = '{"text":"Line\\nBreak\\tTab\\"Quote"}';
      const expected = '{ text: "Line\\nBreak\\tTab\\"Quote" }';
      expect(NudgeConverter.jsonToJsObject(input)).toBe(expected);
    });

    it("should handle special property names correctly", () => {
      const input = '{"special-key":123,"$key":456}';
      const expected = '{ "special-key": 123, $key: 456 }';
      expect(NudgeConverter.jsonToJsObject(input)).toBe(expected);
    });

    it.skip("should handle empty structures correctly", () => {
      const input = '{"empty":{},"emptyArray":[]}';
      const expected = "{ empty: {}, emptyArray: [] }";
      expect(NudgeConverter.jsonToJsObject(input)).toBe(expected);
    });

    it("should throw error for invalid JSON", () => {
      const input = '{"invalid": "json",}';
      expect(() => NudgeConverter.jsonToJsObject(input)).toThrow("Invalid JSON input");
    });
  });

  describe("jsObjectToJson", () => {
    it("should convert JS object to JSON", () => {
      const input = "{name: 'John', age: 30}";
      const result = NudgeConverter.jsObjectToJson(input);
      expect(result).toBe('{"name":"John","age":30}');
    });

    it("should convert nested objects correctly", () => {
      const input = '{ user: { name: "John", age: 30 } }';
      const expected = '{"user":{"name":"John","age":30}}';
      expect(NudgeConverter.jsObjectToJson(input)).toBe(expected);
    });

    it("should convert arrays with mixed types correctly", () => {
      const input = '{ items: [1, "two", null, { x: 1 }] }';
      const expected = '{"items":[1,"two",null,{"x":1}]}';
      expect(NudgeConverter.jsObjectToJson(input)).toBe(expected);
    });

    it("should convert undefined values to null", () => {
      const input = '{ name: "John", status: undefined, data: { age: 30 } }';
      const expected = '{"name":"John","status":null,"data":{"age":30}}';
      expect(NudgeConverter.jsObjectToJson(input)).toBe(expected);
    });

    it("should handle pre-quoted property names correctly", () => {
      const input = '{ "special-key": 123, "normal": 456 }';
      const expected = '{"special-key":123,"normal":456}';
      expect(NudgeConverter.jsObjectToJson(input)).toBe(expected);
    });

    it("should handle special characters correctly", () => {
      const input = '{ text: "Line\\nBreak\\tTab\\"Quote" }';
      const expected = '{"text":"Line\\nBreak\\tTab\\"Quote"}';
      expect(NudgeConverter.jsObjectToJson(input)).toBe(expected);
    });

    it("should throw error for invalid JavaScript object literal", () => {
      const input = "{ invalid: syntax, }";
      expect(() => NudgeConverter.jsObjectToJson(input)).toThrow("Invalid JavaScript object literal");
    });
  });

  describe("toUnicode", () => {
    it("should convert string to Unicode", () => {
      const input = "Hello";
      const result = NudgeConverter.toUnicode(input);
      expect(result).toBe("\\u0048\\u0065\\u006c\\u006c\\u006f");
    });
  });

  describe("fromUnicode", () => {
    it("should convert Unicode to string", () => {
      const input = "\\u0048\\u0065\\u006c\\u006c\\u006f";
      const result = NudgeConverter.fromUnicode(input);
      expect(result).toBe("Hello");
    });
  });

  describe("trim", () => {
    it("should trim all whitespaces", () => {
      const input = "  Hello World ";
      const result = NudgeConverter.trim(input);
      expect(result).toBe("Hello World");
    });
  });

  describe("URL Validation", () => {
    describe("URL Encoding with Validation", () => {
      it("should encode valid URL", () => {
        const validUrl = "https://example.com/path?name=John Doe";
        const encoded = NudgeConverter.encodeUrl(validUrl);
        expect(encoded).toBe("https%3A%2F%2Fexample.com%2Fpath%3Fname%3DJohn%20Doe");
      });

      it("should throw error for invalid URL during encoding", () => {
        const invalidUrl = "not a url";
        expect(() => NudgeConverter.encodeUrl(invalidUrl)).toThrow("Invalid URL format");
      });
    });

    describe("URL Decoding with Validation", () => {
      it("should decode valid encoded URL", () => {
        const encodedUrl = "https%3A%2F%2Fexample.com%2Fpath%3Fname%3DJohn%20Doe";
        const decoded = NudgeConverter.decodeUrl(encodedUrl);
        expect(decoded).toBe("https://example.com/path?name=John Doe");
      });

      it("should throw error for invalid URL encoding", () => {
        const invalidEncoding = "%";
        expect(() => NudgeConverter.decodeUrl(invalidEncoding)).toThrow("Invalid URL encoding");
      });
    });
  });

  describe("Base64 Encoding/Decoding", () => {
    it("should encode string to Base64", () => {
      const input = "Hello World";
      const result = NudgeConverter.encodeBase64(input);
      expect(result).toBe("SGVsbG8gV29ybGQ=");
    });

    it("should decode Base64 to string", () => {
      const input = "SGVsbG8gV29ybGQ=";
      const result = NudgeConverter.decodeBase64(input);
      expect(result).toBe("Hello World");
    });

    it("should handle empty string for Base64 encoding", () => {
      const input = "";
      const result = NudgeConverter.encodeBase64(input);
      expect(result).toBe("");
    });
  });

  describe("HTML Entity Conversion", () => {
    it("should encode text to HTML entities", () => {
      const input = "<div>Hello & 'World'</div>";
      const result = NudgeConverter.encodeHtmlEntities(input);
      expect(result).toBe("&lt;div&gt;Hello &amp; &#39;World&#39;&lt;/div&gt;");
    });

    it("should decode HTML entities to plain text", () => {
      const input = "&lt;div&gt;Hello &amp; &#39;World&#39;&lt;/div&gt;";
      const result = NudgeConverter.decodeHtmlEntities(input);
      expect(result).toBe("<div>Hello & 'World'</div>");
    });
  });

  describe("Case Transformations", () => {
    it("should convert to camelCase", () => {
      expect(NudgeConverter.toCamelCase("hello world")).toBe("helloWorld");
      expect(NudgeConverter.toCamelCase("Hello World")).toBe("helloWorld");
      expect(NudgeConverter.toCamelCase("hello-world")).toBe("helloWorld");
      expect(NudgeConverter.toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("should convert to snake_case", () => {
      expect(NudgeConverter.toSnakeCase("hello world")).toBe("hello_world");
      expect(NudgeConverter.toSnakeCase("helloWorld")).toBe("hello_world");
      expect(NudgeConverter.toSnakeCase("HelloWorld")).toBe("hello_world");
      expect(NudgeConverter.toSnakeCase("hello-world")).toBe("hello_world");
    });

    it("should convert to kebab-case", () => {
      expect(NudgeConverter.toKebabCase("hello world")).toBe("hello-world");
      expect(NudgeConverter.toKebabCase("helloWorld")).toBe("hello-world");
      expect(NudgeConverter.toKebabCase("HelloWorld")).toBe("hello-world");
      expect(NudgeConverter.toKebabCase("hello_world")).toBe("hello-world");
    });

    it("should convert to PascalCase", () => {
      expect(NudgeConverter.toPascalCase("hello world")).toBe("HelloWorld");
      expect(NudgeConverter.toPascalCase("helloWorld")).toBe("HelloWorld");
      expect(NudgeConverter.toPascalCase("hello-world")).toBe("HelloWorld");
      expect(NudgeConverter.toPascalCase("hello_world")).toBe("HelloWorld");
    });
  });

  describe("Advanced JSON Operations", () => {
    it("should format JSON with proper indentation", () => {
      const input = '{"name":"John","age":30,"address":{"city":"New York","zip":"10001"}}';
      const expected = `{
  "name": "John",
  "age": 30,
  "address": {
    "city": "New York",
    "zip": "10001"
  }
}`;
      const result = NudgeConverter.formatJson(input);
      expect(result).toBe(expected);
    });

    it("should minify JSON by removing whitespace", () => {
      const input = `{
  "name": "John",
  "age": 30,
  "address": {
    "city": "New York",
    "zip": "10001"
  }
}`;
      const expected = '{"name":"John","age":30,"address":{"city":"New York","zip":"10001"}}';
      const result = NudgeConverter.minifyJson(input);
      expect(result).toBe(expected);
    });

    it("should sort JSON keys alphabetically", () => {
      const input = '{"z":1,"a":2,"nested":{"y":3,"x":4}}';
      const expected = `{
  "a": 2,
  "nested": {
    "x": 4,
    "y": 3
  },
  "z": 1
}`;
      const result = NudgeConverter.sortJsonKeys(input);
      expect(result).toBe(expected);
    });

    it("should throw error for invalid JSON in advanced operations", () => {
      const input = '{"invalid": "json",}';
      expect(() => NudgeConverter.formatJson(input)).toThrow("Invalid JSON");
      expect(() => NudgeConverter.minifyJson(input)).toThrow("Invalid JSON");
      expect(() => NudgeConverter.sortJsonKeys(input)).toThrow("Invalid JSON");
    });
  });
});
