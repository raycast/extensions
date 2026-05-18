import { describe, expect, it } from "vitest";
import { decommafy } from "./decommafy";

describe("decommafy() — basic", () => {
  const cases: [string, string][] = [
    ["1,234", "1234"],
    ["12,345", "12345"],
    ["1,234,567", "1234567"],
    ["1,234.56", "1234.56"],
    ["1,234,567.89", "1234567.89"],
    // not a valid comma-formatted number — leave alone
    ["1,23", "1,23"],
    ["1234", "1234"],
    ["abc,def", "abc,def"],
    // mixed sentence
    ["売上は1,234,567円、利益は-50,000円でした", "売上は1234567円、利益は-50000円でした"],
    // multiple in one string
    ["A=1,234, B=5,678", "A=1234, B=5678"],
    // edges
    ["", ""],
    ["こんにちは", "こんにちは"],
  ];

  it.each(cases)("%j → %j", (input, expected) => {
    expect(decommafy(input).text).toBe(expected);
  });

  it("counts the numbers it changed", () => {
    expect(decommafy("A=1,234, B=5,678").count).toBe(2);
    expect(decommafy("nothing here").count).toBe(0);
  });

  it("supports a custom separator", () => {
    expect(decommafy("1_234_567", { separator: "_" }).text).toBe("1234567");
    expect(decommafy("1 234 567", { separator: " " }).text).toBe("1234567");
  });
});

describe("decommafy() — boundary safety", () => {
  // partial grouped numbers (digit before the leading group) must NOT be touched
  const cases: [string, string][] = [
    // "1234,567" — leading "1234" is 4 digits, so "234,567" is NOT a valid match
    ["1234,567", "1234,567"],
    ["foo1234,567 bar", "foo1234,567 bar"],
    // alphanumeric boundaries
    ["Order#1,234A", "Order#1,234A"],
    ["A1,234", "A1,234"],
    // trailing digit after a valid group must invalidate the match
    ["1,2345", "1,2345"],
    // but standalone groups are fine even when adjacent to non-alphanumeric
    ["#1,234.56", "#1234.56"],
    ["(1,234)", "(1234)"],
  ];

  it.each(cases)("%j → %j", (input, expected) => {
    expect(decommafy(input).text).toBe(expected);
  });
});

describe("decommafy() — custom separator boundary", () => {
  // underscore separator — same boundary rules apply
  const cases: [string, string][] = [
    // partial grouped numbers
    ["1234_567", "1234_567"],
    ["1_2345", "1_2345"],
    // alphanumeric boundaries
    ["A1_234", "A1_234"],
    ["1_234A", "1_234A"],
    // non-alphanumeric adjacency is fine
    ["#1_234.56", "#1234.56"],
    ["(1_234)", "(1234)"],
    // valid groups
    ["1_234_567", "1234567"],
    ["売上1_234円", "売上1234円"],
  ];

  it.each(cases)('separator="_": %j → %j', (input, expected) => {
    expect(decommafy(input, { separator: "_" }).text).toBe(expected);
  });
});

describe("decommafy() — separator sanitization", () => {
  it("falls back to comma for empty separator", () => {
    expect(decommafy("1,234,567", { separator: "" }).text).toBe("1234567");
  });
});
