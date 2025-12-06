// D&D Beyond utility tests

import { extractDdbInput } from "../src/utils/ddb";

describe("extractDdbInput", () => {
  test("extracts ID from D&D Beyond URL", () => {
    const result = extractDdbInput("https://www.dndbeyond.com/characters/12345678");
    expect(result).toEqual({ kind: "url", value: "12345678" });
  });

  test("handles URL with trailing slash", () => {
    const result = extractDdbInput("https://www.dndbeyond.com/characters/12345678/");
    expect(result).toEqual({ kind: "url", value: "12345678" });
  });

  test("handles URL with query parameters", () => {
    const result = extractDdbInput("https://www.dndbeyond.com/characters/12345678?tab=spells");
    expect(result).toEqual({ kind: "url", value: "12345678" });
  });

  test("handles raw numeric ID", () => {
    const result = extractDdbInput("12345678");
    expect(result).toEqual({ kind: "url", value: "12345678" });
  });

  test("detects inline JSON", () => {
    const result = extractDdbInput('{"name":"Test"}');
    expect(result).toEqual({ kind: "inline", value: '{"name":"Test"}' });
  });
});
