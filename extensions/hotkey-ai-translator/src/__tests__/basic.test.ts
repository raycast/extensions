import { describe, it, expect } from "vitest";

describe("基本的なテスト", () => {
  it("1 + 1 は 2 になること", () => {
    expect(1 + 1).toBe(2);
  });

  it("文字列の結合が正しく動作すること", () => {
    expect("Hello " + "World").toBe("Hello World");
  });

  it("配列の操作が正しく動作すること", () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr).toContain(2);
  });

  it("非同期処理が正しく動作すること", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
