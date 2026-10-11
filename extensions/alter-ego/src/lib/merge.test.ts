import { describe, expect, it } from "vitest";
import { removeRow, saveRow, upsertRow } from "./merge";
import { AlterEgoMap } from "./types";

describe("upsertRow", () => {
  it("adds a new row while preserving existing rows", () => {
    const map: AlterEgoMap = {
      martin: { type: "app", value: "/Applications/Arc.app" },
    };

    const next = upsertRow(map, "colleague", { type: "app", value: "/Applications/Safari.app" });

    expect(next).toEqual({
      martin: { type: "app", value: "/Applications/Arc.app" },
      colleague: { type: "app", value: "/Applications/Safari.app" },
    });
    // original map is untouched
    expect(map).toEqual({ martin: { type: "app", value: "/Applications/Arc.app" } });
  });

  it("edits an existing row while preserving other rows", () => {
    const map: AlterEgoMap = {
      martin: { type: "app", value: "/Applications/Safari.app" },
      colleague: { type: "app", value: "/Applications/Chrome.app" },
    };

    const next = upsertRow(map, "martin", { type: "app", value: "/Applications/Arc.app" });

    expect(next).toEqual({
      martin: { type: "app", value: "/Applications/Arc.app" },
      colleague: { type: "app", value: "/Applications/Chrome.app" },
    });
  });
});

describe("removeRow", () => {
  it("removes only the targeted row", () => {
    const map: AlterEgoMap = {
      martin: { type: "app", value: "/Applications/Arc.app" },
      colleague: { type: "app", value: "/Applications/Chrome.app" },
    };

    const next = removeRow(map, "martin");

    expect(next).toEqual({ colleague: { type: "app", value: "/Applications/Chrome.app" } });
  });

  it("is a no-op for a username not present in the map", () => {
    const map: AlterEgoMap = { martin: { type: "app", value: "/Applications/Arc.app" } };

    const next = removeRow(map, "nobody");

    expect(next).toEqual(map);
  });
});

describe("saveRow", () => {
  const map: AlterEgoMap = {
    work: { type: "app", value: "/Applications/Arc.app" },
    colleague: { type: "app", value: "/Applications/Chrome.app" },
  };

  it("moves the row when an existing username is renamed", () => {
    const next = saveRow(map, "work", "personal", { type: "app", value: "/Applications/Arc.app" });

    expect(next).toEqual({
      personal: { type: "app", value: "/Applications/Arc.app" },
      colleague: { type: "app", value: "/Applications/Chrome.app" },
    });
  });

  it("updates in place when the username is unchanged", () => {
    const next = saveRow(map, "work", "work", { type: "app", value: "/Applications/Safari.app" });

    expect(next).toEqual({
      work: { type: "app", value: "/Applications/Safari.app" },
      colleague: { type: "app", value: "/Applications/Chrome.app" },
    });
  });

  it("adds a row without removing anything for a new mapping", () => {
    const next = saveRow(map, undefined, "new", { type: "url", value: "https://example.com" });

    expect(Object.keys(next).sort()).toEqual(["colleague", "new", "work"]);
  });
});
