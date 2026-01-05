import { describe, it, expect } from "vitest";
import { QuoteCorrector } from "../../src/correctors/quote-corrector";

describe("QuoteCorrector", () => {
  const corrector = new QuoteCorrector();

  it("should convert quotes to chinese quotes", () => {
    expect(corrector.handle('老师说"你好"')).toBe("老师说「你好」");
    expect(corrector.handle('"Quote" inside')).toBe("「Quote」inside");
  });

  it("should handle single quotes", () => {
     // implementation uses ' to 「/」?
     expect(corrector.handle("It's me")).toBe("It's me"); // Should NOT change apostrophe?
     // Let's see implementation.
     // It checks "'" or "'". 
     // QuoteCorrector logic is naive: alternates open/close.
     // It might break apostrophes.
  });
});
