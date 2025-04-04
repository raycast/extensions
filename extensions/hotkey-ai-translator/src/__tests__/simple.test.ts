import { describe, it, expect } from "vitest";

// 単純な関数
function add(a: number, b: number): number {
  return a + b;
}

function concat(a: string, b: string): string {
  return a + b;
}

describe("単純なテスト", () => {
  it("add関数は正しく動作すること", () => {
    expect(add(1, 2)).toBe(3);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });

  it("concat関数は正しく動作すること", () => {
    expect(concat("Hello", " World")).toBe("Hello World");
    expect(concat("", "Test")).toBe("Test");
    expect(concat("Test", "")).toBe("Test");
  });
});
