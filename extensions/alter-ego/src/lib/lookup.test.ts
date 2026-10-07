import { describe, expect, it } from "vitest";
import { lookupTarget } from "./lookup";
import { AlterEgoMap } from "./types";

const map: AlterEgoMap = {
  martin: { type: "app", value: "/Applications/Arc.app" },
  "martin-personal": { type: "app", value: "/Applications/Safari.app" },
};

describe("lookupTarget", () => {
  it("returns the target for a matched username", () => {
    expect(lookupTarget(map, "martin")).toEqual(map.martin);
  });

  it("returns undefined for an unmatched username", () => {
    expect(lookupTarget(map, "someone-else")).toBeUndefined();
  });

  it("returns undefined for an undefined username", () => {
    expect(lookupTarget(map, undefined)).toBeUndefined();
  });

  it("returns undefined for a null username", () => {
    expect(lookupTarget(map, null)).toBeUndefined();
  });

  it("returns undefined for an empty/whitespace username", () => {
    expect(lookupTarget(map, "")).toBeUndefined();
    expect(lookupTarget(map, "   ")).toBeUndefined();
  });

  it("returns undefined for an empty map", () => {
    expect(lookupTarget({}, "martin")).toBeUndefined();
  });
});
