import { describe, it, expect } from "vitest";
import { FormatterService } from "../src/services/formatter-service";

describe("FormatterService", () => {
  const service = new FormatterService();

  it("should format complex text correctly", () => {
    const input = '在LeanCloud上,数据存储是围绕AVObject进行的.老师说"你好"';
    const expected = '在 LeanCloud 上，数据存储是围绕 AVObject 进行的。老师说「你好」';
    expect(service.format(input)).toBe(expected);
  });

  it("should protect markdown code blocks", () => {
    const input = '你好\n```js\nconst x = "hello";\n```\n世界';
    const formatted = service.format(input);
    
    // Check that code content is preserved exactly
    expect(formatted).toContain('const x = "hello";');
    expect(formatted).not.toContain('const x = 「hello」;');
    
    // Check that surrounding text is formatted (if applicable)
    // Note: SpaceCorrector might add spaces around the block if it sees it as "English" (underscore)
  });

  it("should protect inline code", () => {
      const input = "这是一个`inline code`示例";
      const formatted = service.format(input);
      expect(formatted).toContain("`inline code`");
      // Space logic: "这是一个 `inline code` 示例" ?
      // If placeholder looks like English, it might get spaces.
      expect(formatted).toBe("这是一个 `inline code` 示例");
  });
});
