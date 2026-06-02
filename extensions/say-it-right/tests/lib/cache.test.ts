import { describe, it, expect } from "vitest";
import { analysisCacheKey } from "../../src/lib/cache-key";

describe("analysisCacheKey", () => {
  it("is stable for identical inputs and varies by provider/accent/model", () => {
    const a = analysisCacheKey("hello", "openai", "GA", "gpt-5.5");
    const b = analysisCacheKey("hello", "openai", "GA", "gpt-5.5");
    const c = analysisCacheKey("hello", "qwen", "GA", "qwen3.6-flash");
    const d = analysisCacheKey("hello", "openai", "GA", "other-model");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});
