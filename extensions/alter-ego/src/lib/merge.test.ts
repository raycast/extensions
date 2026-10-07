import { describe, expect, it } from "vitest";
import { removeRow, upsertRow } from "./merge";
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
