import { describe, expect, it } from "vitest";
import { parseLaunchdLabels } from "./labels";

describe("parseLaunchdLabels", () => {
  it("returns no labels when the preference is missing", () => {
    expect(parseLaunchdLabels(undefined)).toEqual([]);
  });

  it("returns no labels when the preference is blank", () => {
    expect(parseLaunchdLabels(" ,  , ")).toEqual([]);
  });

  it("trims and keeps configured labels", () => {
    expect(parseLaunchdLabels(" com.example.one, com.example.two ")).toEqual([
      "com.example.one",
      "com.example.two",
    ]);
  });
});
