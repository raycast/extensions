import { describe, it, expect } from "vitest";
import { PunctuationCorrector } from "../../src/correctors/punctuation-corrector";

describe("PunctuationCorrector", () => {
  const corrector = new PunctuationCorrector();

  it("should normalize ellipsis", () => {
    expect(corrector.handle("Wait...")).toBe("Wait…");
    expect(corrector.handle("等一下。。")).toBe("等一下…");
    expect(corrector.handle("Really.....")).toBe("Really…");
  });

  it("should match brackets based on content language", () => {
    // Chinese content -> Chinese brackets
    expect(corrector.handle("这是(测试)内容")).toBe("这是（测试）内容");
    
    // English content inside, but surrounding is Chinese -> Chinese brackets
    expect(corrector.handle("这是(test)内容")).toBe("这是（test）内容"); 
  });

  it("should convert brackets correctly", () => {
     expect(corrector.handle("测试(中文)")).toBe("测试（中文）");
     // If bracket contains English but outside is Chinese?
     // "测试(English)"
     // '(' -> forward 'E' (En). -> '('
     // ')' -> backward 'h' (En). -> ')'
     // Result: "测试(English)" (Correct)
  });
});
