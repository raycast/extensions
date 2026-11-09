import { describe, expect, it } from "vitest";
import { categoryTitle, iconName, LIBRARIES } from "../../src/icons/libraries";
import {
  buildLucideEntries,
  lucideExportName,
  lucideNewNames,
  parseIconNodes,
  pickBaselineVersion,
} from "../../src/icons/lucide";
import { TILE_VIEWBOX, tileToCopy, toSvg, toTile } from "../../src/icons/svg";
import { IconEntry } from "../../src/icons/types";
import { fixture, lucideSample } from "./helpers";

const sample = lucideSample();
const nodes = parseIconNodes(sample.nodes);
const names = Object.keys(nodes);
const entries = buildLucideEntries(sample.tags, sample.categories, names, "svg-1");

describe("Lucide catalog", () => {
  it("builds every icon with tags, categories, and its React name", () => {
    expect(entries).toHaveLength(14);
    expect(entries.find((entry) => entry.name === "a-arrow-down")).toEqual({
      name: "a-arrow-down",
      exportName: "AArrowDown",
      tags: ["letter", "font size", "text", "formatting", "smaller"],
      categories: ["text", "design"],
      file: "svg-1/a-arrow-down.svg",
    });
  });

  it("names exports the way lucide-react does", () => {
    expect(lucideExportName("arrow-down-0-1")).toBe("ArrowDown01");
    expect(lucideExportName("ticket")).toBe("Ticket");
  });

  it("rejects payloads of the wrong shape", () => {
    expect(() => parseIconNodes([])).toThrow("not an object");
    expect(parseIconNodes({ bad: "x", empty: [], ok: [["path", { d: "M0 0" }]] })).toEqual({
      ok: [["path", { d: "M0 0" }]],
    });
  });
});

describe("Lucide New set", () => {
  const times = (JSON.parse(fixture("lucide-static-registry-times.json")) as { time: Record<string, string> }).time;

  it("measures against the newest stable release at least 90 days old", () => {
    expect(pickBaselineVersion(times, Date.parse("2026-10-07T12:00:00Z"))).toBe("1.23.0");
    expect(pickBaselineVersion(times, Date.parse("2020-01-01T00:00:00Z"))).toBeUndefined();
    expect(
      pickBaselineVersion({ "2.0.0-beta.1": "2020-01-01T00:00:00Z", created: "2020-01-01T00:00:00Z" }, Date.now()),
    ).toBeUndefined();
  });

  it("finds the icons added since then", () => {
    expect(lucideNewNames(names, sample.baseline)).toEqual(["broom"]);
  });
});

describe("toSvg", () => {
  it("writes Hugeicons with its own stroke weight and the chosen color", () => {
    expect(
      toSvg([["path", { d: "M1 1", stroke: "currentColor", strokeWidth: "1.5", key: "0" }]], "hugeicons", "#000"),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
        '<path d="M1 1" stroke="#000" stroke-width="1.5"/></svg>\n',
    );
  });

  it("writes Lucide with stroke 2 on the root", () => {
    const svg = toSvg(nodes.ticket, "lucide");
    expect(svg).toContain('stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"');
    expect(svg).not.toContain("key=");
  });

  it("escapes attribute values", () => {
    expect(toSvg([["path", { d: 'a"<b&' }]], "hugeicons")).toContain('d="a&quot;&lt;b&amp;"');
  });

  it("keeps only drawing elements and plain attributes", () => {
    const svg = toSvg(
      [
        ["script", { src: "https://example.com/x.js" }],
        ["image", { href: "file:///etc/passwd" }],
        ["foreignObject", {}],
        ["path", { d: "M1 1", onload: "alert(1)", "xlink:href": "#x", href: "#y", 'd" onclick="x': "1" }],
        ["circle", { cx: "12", cy: "12", r: "3" }],
      ],
      "hugeicons",
    );
    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
        '<path d="M1 1"/><circle cx="12" cy="12" r="3"/></svg>\n',
    );
  });

  it("draws tiles at 128 px, centered inside a wider frame", () => {
    const tile = toTile(nodes.ticket, "lucide");
    expect(TILE_VIEWBOX).toBe("-4.00 -4.00 32 32");
    expect(tile).toContain(`width="128" height="128" viewBox="${TILE_VIEWBOX}"`);
    expect(tile).toContain('stroke="#000"');
    expect(tileToCopy(tile)).toBe(toSvg(nodes.ticket, "lucide"));
  });

  it("turns a black tile back into a currentColor copy", () => {
    const copy = toSvg(nodes.ticket, "lucide");
    expect(tileToCopy(toSvg(nodes.ticket, "lucide", "#000"))).toBe(copy);
  });
});

describe("library details", () => {
  const ticket: IconEntry = { name: "ticket-01", exportName: "Ticket01Icon", tags: [], categories: [], file: "" };
  const lucideTicket: IconEntry = { name: "ticket", exportName: "Ticket", tags: [], categories: [], file: "" };

  it("writes names in each format, with the library in front only when asked", () => {
    expect(iconName("hugeicons", ticket, "import", false)).toBe("Ticket01Icon");
    expect(iconName("hugeicons", ticket, "icon", false)).toBe("ticket-01");
    expect(iconName("lucide", lucideTicket, "import", false)).toBe("Ticket");
    expect(iconName("lucide", lucideTicket, "icon", false)).toBe("ticket");
    expect(iconName("lucide", lucideTicket, "import", true)).toBe("Lucide Ticket");
    expect(iconName("hugeicons", ticket, "icon", true)).toBe("Hugeicons ticket-01");
  });

  it("adds a stroke width to React code only when one is set", () => {
    expect(LIBRARIES.hugeicons.reactCode(ticket, "2")).toContain(
      "<HugeiconsIcon icon={Ticket01Icon} strokeWidth={2} />",
    );
    expect(LIBRARIES.lucide.reactCode(lucideTicket, "1.5")).toContain("<Ticket strokeWidth={1.5} />");
  });

  it("writes React code for each library", () => {
    expect(LIBRARIES.hugeicons.reactCode(ticket)).toBe(
      'import { HugeiconsIcon } from "@hugeicons/react";\nimport { Ticket01Icon } from "@hugeicons/core-free-icons";\n\n<HugeiconsIcon icon={Ticket01Icon} />',
    );
    expect(LIBRARIES.lucide.reactCode(lucideTicket)).toBe('import { Ticket } from "lucide-react";\n\n<Ticket />');
  });

  it("links each icon's official page", () => {
    expect(LIBRARIES.hugeicons.pageUrl(ticket)).toBe("https://hugeicons.com/icon/ticket-01");
    expect(LIBRARIES.lucide.pageUrl(lucideTicket)).toBe("https://lucide.dev/icons/ticket");
  });

  it("titles categories", () => {
    expect(categoryTitle("files-folders")).toBe("Files & Folders");
    expect(categoryTitle("ai")).toBe("AI");
    expect(categoryTitle("science")).toBe("Science");
    expect(categoryTitle("food-drinks")).toBe("Food Drinks");
  });
});
