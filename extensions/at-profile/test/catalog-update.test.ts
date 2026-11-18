import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { environment } from "@raycast/api";
import { catalogSites, catalogSource, findCatalogSite, saveCatalog } from "../src/catalog";

const file = join(environment.supportPath, "catalog.json");
const site = (name: string) => ({
  id: `catalog-${name.toLowerCase()}`,
  name,
  urlTemplate: `https://${name.toLowerCase()}.example/{profile}`,
  homepage: `https://${name.toLowerCase()}.example`,
  knownUsername: "example_user",
  nsfw: false,
  check: { signals: ["status" as const] },
  reliability: "works" as const,
});

afterEach(() => rmSync(file, { force: true }));

describe("Update Catalog", () => {
  it("uses an updated catalog once it's saved, and keeps this extension's own sites", () => {
    const bundledCount = catalogSites().length;
    saveCatalog({
      source: { repository: "https://github.com/sherlock-project/sherlock", commit: "abc", license: "MIT" },
      probedAt: "2026-11-09",
      sites: [site("Newsite")],
    });
    expect(catalogSites().map((entry) => entry.name)).toEqual(["Newsite", "Blacksky"]);
    expect(findCatalogSite("catalog-newsite")?.name).toBe("Newsite");
    expect(catalogSource()).toMatchObject({ probedAt: "2026-11-09", updated: true });
    expect(bundledCount).toBeGreaterThan(400);
  });

  // A fresh copy of the module reads the file the way a new command does. Resetting modules also gives the
  // @raycast/api stub a new support directory, so the file goes into that one.
  const freshCatalog = async (contents: string) => {
    vi.resetModules();
    const { environment: fresh } = await import("@raycast/api");
    writeFileSync(join(fresh.supportPath, "catalog.json"), contents);
    return import("../src/catalog");
  };

  it("reads a saved catalog when a command starts", async () => {
    const catalog = await freshCatalog(
      JSON.stringify({ source: {}, probedAt: "2026-11-09", sites: [site("Newsite")] }),
    );
    expect(catalog.catalogSource().updated).toBe(true);
    expect(catalog.findCatalogSite("catalog-newsite")).toBeDefined();
  });

  it("falls back to the bundled catalog when the saved file is damaged", async () => {
    const catalog = await freshCatalog("{not json");
    expect(catalog.catalogSites().length).toBeGreaterThan(400);
    expect(catalog.findCatalogSiteByName("GitHub")).toBeDefined();
    expect(catalog.catalogSource().updated).toBe(false);
  });

  it("falls back to the bundled catalog when the saved one has no sites", async () => {
    const catalog = await freshCatalog(JSON.stringify({ source: {}, probedAt: "2026-11-09", sites: [] }));
    expect(catalog.findCatalogSiteByName("GitHub")).toBeDefined();
    expect(catalog.catalogSource().updated).toBe(false);
  });
});
