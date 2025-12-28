import { describe, it, expect } from "vitest";
import { parseDropdownValue } from "./dropdown-utils";

describe("parseDropdownValue", () => {
  it("parses valid prefixed values", () => {
    expect(parseDropdownValue("sort:popularity")).toEqual(["sort", "popularity"]);
    expect(parseDropdownValue("transport:http")).toEqual(["transport", "http"]);
  });

  it("handles values with multiple colons", () => {
    expect(parseDropdownValue("type:value:with:colons")).toEqual(["type", "value:with:colons"]);
  });

  it("handles values without colons", () => {
    expect(parseDropdownValue("popularity")).toEqual(["", "popularity"]);
  });

  it("handles empty string", () => {
    expect(parseDropdownValue("")).toEqual(["", ""]);
  });
});
