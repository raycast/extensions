import { describe, expect, test } from "bun:test";
import {
  explainPaletteEdit,
  paletteHexes,
  parsePaletteHex,
  parsePaletteHexList,
} from "../lib/paletteColors";

describe("parsePaletteHex", () => {
  test.each([
    ["#ff5500", "#FF5500"],
    ["  F50 ", "#FF5500"],
    ["4ecdc4", "#4ECDC4"],
  ])("reads %j as %s", (value, hex) => {
    expect(parsePaletteHex(value)).toBe(hex);
  });

  test.each(["rgb(1, 2, 3)", "red", "#ff550080", "#ff55", "", "##fff"])(
    "refuses %j",
    (value) => {
      expect(parsePaletteHex(value)).toBeNull();
    },
  );
});

test("parsePaletteHexList splits on commas and spaces and keeps what isn't a hex code", () => {
  expect(parsePaletteHexList("#ff5500, 2a9d8f #FF5500 teal")).toEqual({
    hexes: ["#FF5500", "#2A9D8F"],
    invalid: ["teal"],
  });
  expect(parsePaletteHexList(undefined)).toEqual({ hexes: [], invalid: [] });
});

test("paletteHexes normalizes, drops alpha and drops repeats", () => {
  expect(
    paletteHexes([{ hex: "#ff5500" }, { hex: "#FF5500" }, { hex: "#000" }]),
  ).toEqual(["#FF5500", "#000000"]);
  expect(paletteHexes([{ hex: "#FF000080" }, { hex: "#ff0000" }])).toEqual([
    "#FF0000",
  ]);
});

describe("explainPaletteEdit", () => {
  const twelve = Array.from(
    { length: 12 },
    (_, i) => `#0000${i.toString(16).padStart(2, "0").toUpperCase()}`,
  );

  test("allows a swap on a full palette", () => {
    expect(
      explainPaletteEdit(twelve, {
        add: ["#FFFFFF"],
        invalid: [],
        remove: [twelve[0] as string],
      }),
    ).toBeNull();
  });

  test.each([
    [
      "a thirteenth color",
      twelve,
      { add: ["#FFFFFF"], invalid: [], remove: [] },
      "A palette holds up to 12 colors.",
    ],
    [
      "removing the last color",
      ["#FF5500"],
      { add: [], invalid: [], remove: ["#FF5500"] },
      "A palette needs at least one color.",
    ],
    [
      "a value that isn't a hex code",
      ["#FF5500"],
      { add: [], invalid: ["teal"], remove: [] },
      "Not a hex code: teal. Use one such as #FF5500.",
    ],
  ])("refuses %s", (_, current, edit, message) => {
    expect(explainPaletteEdit(current, edit)).toBe(message);
  });
});
