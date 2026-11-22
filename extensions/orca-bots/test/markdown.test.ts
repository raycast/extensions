import { describe, expect, test } from "bun:test";
import { quote } from "../src/lib/markdown";

describe("quote", () => {
  test("prefixes every line, including blank ones", () => {
    expect(quote("a\n\nb")).toBe("> a\n> \n> b");
  });

  test("keeps markdown characters inside the quote block", () => {
    expect(quote("*oops* _x_ `y`")).toBe("> *oops* _x_ `y`");
  });
});
