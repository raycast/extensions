import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCatalogue, toItems, type Catalogue, type CatalogueIcon } from "../src/catalogue";
import { search } from "../src/search";

const icon = (name: string, overrides: Partial<CatalogueIcon> = {}): CatalogueIcon => {
  const pascal = name.replace(/(^|-)(\w)/g, (_, __, letter: string) => letter.toUpperCase());
  return {
    name,
    tags: [],
    categories: [],
    aliases: [],
    useCases: [],
    variants: ["filled", "duotone"],
    components: { filled: `${pascal}Filled`, duotone: `${pascal}Duotone` },
    ...overrides,
  };
};

const items = toItems({
  version: "1.2.3",
  icons: [
    icon("activity", { tags: ["heart", "pulse"] }),
    icon("circle-alert", { aliases: ["alert-circle"], tags: ["warning"] }),
    icon("heart"),
    icon("heart-crack", { variants: ["filled"], components: { filled: "HeartCrackFilled" } }),
    icon("play", { useCases: ["Starting a video"] }),
    icon("wand", { variants: ["duotone"], components: { duotone: "WandDuotone" }, deprecated: "No longer needed." }),
  ],
});
const slugs = (query: string, style?: "all" | "filled" | "duotone") => search(items, query, style).map((i) => i.slug);

describe("toItems", () => {
  it("makes one item per variant that exists, filled first", () => {
    expect(items.map((i) => i.slug)).toEqual([
      "activity-filled",
      "activity-duotone",
      "circle-alert-filled",
      "circle-alert-duotone",
      "heart-filled",
      "heart-duotone",
      "heart-crack-filled",
      "play-filled",
      "play-duotone",
      "wand-duotone",
    ]);
  });

  it("uses the catalogue's component names and pins URLs to the version", () => {
    const wand = items.find((i) => i.name === "wand");
    expect(wand).toMatchObject({
      component: "WandDuotone",
      deprecated: "No longer needed.",
      url: "https://cdn.jsdelivr.net/npm/lucide-extended-static@1.2.3/icons/wand-duotone.svg",
    });
  });
});

describe("search", () => {
  it("returns everything for an empty query, in order", () => {
    expect(slugs("  ")).toEqual(items.map((i) => i.slug));
  });

  it("ranks exact name, prefix, then tags, keeping pairs together", () => {
    expect(slugs("heart")).toEqual([
      "heart-filled",
      "heart-duotone",
      "heart-crack-filled",
      "activity-filled",
      "activity-duotone",
    ]);
  });

  it("finds an icon by its alias without listing the alias", () => {
    expect(slugs("alert-circle")).toEqual(["circle-alert-filled", "circle-alert-duotone"]);
  });

  it("narrows by style when a word names one", () => {
    expect(slugs("heart filled")).toEqual(["heart-filled", "heart-crack-filled", "activity-filled"]);
    expect(slugs("heart duotone")).toEqual(["heart-duotone", "activity-duotone"]);
  });

  it("requires every word to match", () => {
    expect(slugs("heart crack")).toEqual(["heart-crack-filled"]);
    expect(slugs("heart nothing")).toEqual([]);
  });

  it("finds copied names, whatever the case", () => {
    expect(slugs("heart-duotone")).toEqual(["heart-duotone"]);
    expect(slugs("HeartFilled")).toEqual(["heart-filled"]);
  });

  it("matches use cases from the start of a word", () => {
    expect(slugs("starting")).toEqual(["play-filled", "play-duotone"]);
    expect(slugs("tarting")).toEqual([]);
  });

  it("applies the style filter", () => {
    expect(slugs("heart", "duotone")).toEqual(["heart-duotone", "activity-duotone"]);
    expect(slugs("", "duotone")).toHaveLength(5);
  });
});

describe("parseCatalogue", () => {
  it("reads the version jsDelivr resolved", async () => {
    const response = new Response(JSON.stringify({ icons: [icon("heart")] }), {
      headers: { "x-jsd-version": "1.2.3" },
    });
    await expect(parseCatalogue(response)).resolves.toMatchObject({ version: "1.2.3" });
  });

  it("rejects a failed response", async () => {
    await expect(parseCatalogue(new Response("", { status: 503 }))).rejects.toThrow("503");
  });
});

// The published extension lives outside this repo, where the catalogue isn't available
const repoCatalogue = path.join(__dirname, "../../icons.json");

describe.skipIf(!existsSync(repoCatalogue))("the real icons.json", () => {
  const { icons } = JSON.parse(readFileSync(repoCatalogue, "utf8")) as Catalogue;
  const all = toItems({ version: "0.0.0", icons });

  it("expands to one item per variant, each with a component", () => {
    expect(all).toHaveLength(icons.reduce((count, entry) => count + entry.variants.length, 0));
    expect(all.every((item) => item.component)).toBe(true);
    expect(new Set(all.map((item) => item.slug)).size).toBe(all.length);
  });

  it("finds real icons by name and alias", () => {
    expect(search(all, "heart")[0].slug).toBe("heart-filled");
    expect(search(all, "alert-circle")[0].name).toBe("circle-alert");
  });
});
