import { describe, expect, it } from "vitest";
import {
  buildHugeiconsEntries,
  hugeiconsNewNames,
  nameFromExport,
  parseIconModule,
  parseIndexExports,
  parseShippedHugeicons,
} from "../../src/icons/hugeicons";
import { fixture, shippedHugeicons } from "./helpers";

const shipped = shippedHugeicons();
const exports = JSON.parse(fixture("hugeicons-4.3.5-exports.json")) as Record<string, string[]>;

describe("parseShippedHugeicons", () => {
  it("reads each drawing's name, category, and tags, and skips entries without a name", () => {
    expect(shipped.version).toBe("4.3.5");
    expect(shipped.icons.FirstBracketIcon).toEqual({
      name: "1st-bracket",
      category: "math",
      tags: ["parentheses", "brackets"],
    });
    expect(shipped.icons.NoNameIcon).toBeUndefined();
  });

  it("fills a missing category and cleans tags", () => {
    const parsed = parseShippedHugeicons({ icons: { AIcon: { name: "a", tags: [" Big ", "big", 3] } } });
    expect(parsed).toEqual({ version: "", icons: { AIcon: { name: "a", category: "other", tags: ["big"] } }, new: [] });
    expect(parseShippedHugeicons({ icons: {}, new: ["AIcon", 4] }).new).toEqual(["AIcon"]);
  });

  it("rejects a file without an icons map", () => {
    expect(() => parseShippedHugeicons({ icons: [] })).toThrow("unreadable");
    expect(() => parseShippedHugeicons(null)).toThrow("unreadable");
  });
});

describe("nameFromExport", () => {
  it("names a drawing from its export the way ship.py does", () => {
    expect(nameFromExport("ArchiveOff01Icon")).toBe("archive-off-01");
    expect(nameFromExport("CIcon")).toBe("c");
    expect(nameFromExport("Grid2x2Icon")).toBe("grid-2-x-2");
  });
});

describe("buildHugeiconsEntries", () => {
  const sample = Object.fromEntries(
    ["Ticket01Icon", "ClockHour7Icon", "SuperNewThing02Icon", "FirstBracketIcon"].map((file) => [
      file,
      exports[file] ?? ["SuperNewThing02", "SuperNewThingTwo"],
    ]),
  );
  const entries = buildHugeiconsEntries(shipped, sample, "svg-9-4.4.0");

  it("keeps the shipped names and tags, A–Z, pointing at each tile", () => {
    expect(entries.map((entry) => entry.name)).toEqual([
      "1st-bracket",
      "clock-hour-7",
      "super-new-thing-02",
      "ticket-01",
    ]);
    expect(entries.find((entry) => entry.name === "ticket-01")).toEqual({
      name: "ticket-01",
      exportName: "Ticket01Icon",
      tags: ["admission", "pass", "event"],
      categories: ["travel"],
      file: "svg-9-4.4.0/Ticket01Icon.svg",
    });
  });

  it("still shows a drawing newer than the shipped list, found by its other names", () => {
    expect(entries.find((entry) => entry.exportName === "SuperNewThing02Icon")).toMatchObject({
      name: "super-new-thing-02",
      tags: ["super new thing two"],
      categories: ["other"],
    });
  });

  it("never shows two tiles under one name, preferring the shipped drawing", () => {
    const clash = buildHugeiconsEntries(
      { version: "", icons: { Ticket01Icon: { name: "ticket-01", category: "travel", tags: [] } }, new: [] },
      { Ticket01aIcon: ["Ticket01a"], Ticket01Icon: ["Ticket01"], TicketZeroOneIcon: ["TicketZeroOne"] },
      "svg",
    );
    expect(clash.map((entry) => [entry.name, entry.exportName])).toEqual([
      ["ticket-01", "Ticket01Icon"],
      ["ticket-01-a", "Ticket01aIcon"],
      ["ticket-zero-one", "TicketZeroOneIcon"],
    ]);
  });
});

describe("hugeiconsNewNames", () => {
  const entries = buildHugeiconsEntries(shipped, { Ticket01Icon: ["Ticket01"], Ticket02Icon: ["Ticket02"] }, "svg");

  it("marks the drawings the shipped list calls new", () => {
    expect(hugeiconsNewNames(entries, { ...shipped, new: ["Ticket02Icon"] })).toEqual(["ticket-02"]);
    expect(hugeiconsNewNames(entries, { ...shipped, new: [] })).toEqual([]);
  });

  it("also marks drawings newer than the shipped list", () => {
    const newer = buildHugeiconsEntries(shipped, { Ticket01Icon: ["Ticket01"], BrandNewIcon: ["BrandNew"] }, "svg");
    expect(hugeiconsNewNames(newer, { ...shipped, new: [] })).toEqual(["brand-new"]);
  });
});

describe("parseIndexExports", () => {
  const sample = parseIndexExports(fixture("hugeicons-index-sample.js"));

  it("lists every Icon-suffixed name for each drawing", () => {
    expect(sample.ClockHour1Icon).toEqual(["ClockHour1", "ClockHourOne"]);
    expect(sample.ArrowDown01Icon).toEqual(["ArrowDown01", "ArrowDown"]);
  });

  it("agrees with the full saved export map", () => {
    for (const [file, names] of Object.entries(sample)) expect(exports[file]).toEqual(names);
  });
});

describe("parseIconModule", () => {
  it("reads drawing elements as data", () => {
    expect(parseIconModule(fixture("Add01Icon.js"))).toEqual([
      [
        "path",
        {
          d: "M12.001 5.00003V19.002",
          stroke: "currentColor",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: "1.5",
          key: "0",
        },
      ],
      [
        "path",
        {
          d: "M19.002 12.002L4.99998 12.002",
          stroke: "currentColor",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: "1.5",
          key: "1",
        },
      ],
    ]);
    expect(parseIconModule(fixture("ThreeDViewIcon.js"))).toHaveLength(3);
  });

  it("throws when there is no drawing", () => {
    expect(() => parseIconModule("export {}")).toThrow("No drawing");
  });
});
