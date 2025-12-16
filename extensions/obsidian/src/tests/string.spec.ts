import { expect, describe, it } from "vitest";
import { parseCommaSeparatedValues } from "../api/string/string.service";

describe("parseCommaSeparatedValues", () => {
  it("should return empty array for empty values", () => {
    expect(parseCommaSeparatedValues("")).toEqual([]);
  });

  it("should return single value for strings without commas", () => {
    expect(parseCommaSeparatedValues("test")).toEqual(["test"]);
    expect(parseCommaSeparatedValues("test.123")).toEqual(["test.123"]);
    expect(parseCommaSeparatedValues(" test ")).toEqual(["test"]);
  });

  it("should return correct values for comma-separated strings", () => {
    expect(parseCommaSeparatedValues("test,test2")).toEqual(["test", "test2"]);
    expect(parseCommaSeparatedValues("test, test2")).toEqual(["test", "test2"]);
    expect(parseCommaSeparatedValues("test , test2")).toEqual(["test", "test2"]);
    expect(parseCommaSeparatedValues("test , test2,")).toEqual(["test", "test2"]);
    expect(parseCommaSeparatedValues("test , test2,test3")).toEqual(["test", "test2", "test3"]);
  });

  it("should handle edge cases", () => {
    expect(parseCommaSeparatedValues(",")).toEqual([]);
    expect(parseCommaSeparatedValues(",,")).toEqual([]);
    expect(parseCommaSeparatedValues("test,,test2")).toEqual(["test", "test2"]);
    expect(parseCommaSeparatedValues(" , test , , test2 , ")).toEqual(["test", "test2"]);
  });
});
