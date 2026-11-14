import { describe, expect, it } from "vitest";
import { buildLucideEntries } from "../../src/icons/lucide";
import { bestIcons, foundIcon, perLibrary, toolKeywords } from "../../src/icons/tool-search";
import { lucideSample } from "./helpers";

const sample = lucideSample();
const icons = buildLucideEntries(sample.tags, sample.categories, Object.keys(sample.tags), "svg");
const names = (list: { name: string }[]) => list.map((icon) => icon.name);

describe("Find Icons tool", () => {
  it("splits comma-separated keywords and drops filler", () => {
    expect(toolKeywords("smile, Happy face icon,, smile")).toEqual(["smile", "happy face"]);
    expect(toolKeywords(" , ")).toEqual([]);
  });

  it("returns 5 per library unless asked for 1 to 10", () => {
    expect(perLibrary(undefined)).toBe(5);
    expect(perLibrary(0)).toBe(1);
    expect(perLibrary(3.4)).toBe(3);
    expect(perLibrary(50)).toBe(10);
    expect(perLibrary(Number.NaN)).toBe(5);
  });

  it("finds icons by any keyword, not only one matching every word", () => {
    const found = bestIcons({ library: "lucide", icons }, "zzz-no-match, ticket", 3);
    expect(names(found)).toContain("ticket");
    expect(bestIcons({ library: "lucide", icons }, "", 3)).toEqual([]);
  });

  it("uses the user's own words and puts favorites first", () => {
    const own = bestIcons({ library: "lucide", icons, saved: { broom: ["tidy up"] } }, "tidy up", 3);
    expect(names(own)[0]).toBe("broom");
    const all = bestIcons({ library: "lucide", icons }, "ticket, hand, broom", 3);
    const favored = bestIcons({ library: "lucide", icons, favorites: [all[2].name] }, "ticket, hand, broom", 3);
    expect(favored[0].name).toBe(all[2].name);
  });

  it("returns the name, import name, React code, SVG, and page", () => {
    const ticket = icons.find((entry) => entry.name === "ticket")!;
    expect(foundIcon("lucide", ticket, "<svg/>")).toEqual({
      library: "Lucide",
      name: "ticket",
      importName: "Ticket",
      reactCode: 'import { Ticket } from "lucide-react";\n\n<Ticket />',
      svg: "<svg/>",
      url: "https://lucide.dev/icons/ticket",
    });
  });
});
