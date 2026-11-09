import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Fetcher,
  freeFileName,
  isStale,
  readCatalog,
  readCopySvg,
  refreshCatalog,
  STALE_AFTER_MS,
  tilePath,
  URLS,
} from "../../src/icons/catalog-store";
import { fixture, lucideSample, makeTar } from "./helpers";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const TARBALL = "https://registry.npmjs.org/@hugeicons/core-free-icons/-/core-free-icons-4.3.5.tgz";

const INDEX = [
  "export { default as Add01FreeIcons, default as Add01Icon, default as Plus } from './Add01Icon.js';",
  "export { default as ThreeDViewFreeIcons, default as ThreeDViewIcon } from './ThreeDViewIcon.js';",
  "export { default as BrokenFreeIcons, default as BrokenIcon } from './BrokenIcon.js';",
].join("\n");

const hugeTarball = gzipSync(
  makeTar([
    { path: "package/package.json", data: "{}" },
    { path: "package/dist/esm/index.js", data: INDEX },
    { path: "package/dist/esm/Add01Icon.js", data: fixture("Add01Icon.js") },
    { path: "package/dist/esm/ThreeDViewIcon.js", data: fixture("ThreeDViewIcon.js") },
    { path: "package/dist/esm/BrokenIcon.js", data: "export {}" },
    { path: "package/dist/cjs/Add01Icon.js", data: "ignored" },
  ]),
);

const INTEGRITY = `sha512-${createHash("sha512").update(hugeTarball).digest("base64")}`;

// The list the extension ships: names and our own tags, keyed by drawing file.
const shippedList = {
  version: "4.3.5",
  icons: {
    Add01Icon: { name: "add-01", category: "math", tags: ["plus", "add"] },
    ThreeDViewIcon: { name: "3d-view", category: "shapes", tags: ["cube"] },
    BrokenIcon: { name: "broken", category: "shapes", tags: [] },
  },
  // Built against a release about 90 days older that already had Add01.
  new: ["ThreeDViewIcon", "BrokenIcon"],
};

const lucideNodes = lucideSample().nodes;
const lucideSubset = Object.fromEntries(["ticket", "broom", "hand"].map((name) => [name, lucideNodes[name]]));

class FakeFetcher implements Fetcher {
  calls: string[] = [];
  failing = new Set<string>();
  responses: Record<string, unknown> = {
    [URLS.hugeiconsLatest]: { version: "4.3.5", dist: { tarball: TARBALL, integrity: INTEGRITY } },
    [URLS.lucideTags]: { ticket: ["admission"], broom: ["sweep"], hand: ["wave"] },
    [URLS.lucideCategories]: { ticket: ["travel"], broom: ["home"], hand: ["account"] },
    [URLS.lucideNodes]: lucideSubset,
    [URLS.lucideRegistry]: JSON.parse(fixture("lucide-static-registry-times.json")),
    [URLS.lucideTagsAt("1.23.0")]: { ticket: [], hand: [] },
  };
  texts: Record<string, string> = {};

  async json(url: string) {
    this.calls.push(url);
    if (this.failing.has(url) || !(url in this.responses)) throw new Error(`offline: ${url}`);
    return this.responses[url];
  }

  async text(url: string) {
    this.calls.push(url);
    if (this.failing.has(url) || !(url in this.texts)) throw new Error(`offline: ${url}`);
    return this.texts[url];
  }

  async bytes(url: string) {
    this.calls.push(url);
    if (url !== TARBALL || this.failing.has(url)) throw new Error(`offline: ${url}`);
    // Small chunks, the way a network stream arrives.
    return (async function* () {
      for (let i = 0; i < hugeTarball.length; i += 300) yield hugeTarball.subarray(i, i + 300);
    })();
  }
}

let root: string;
let fetcher: FakeFetcher;
let hugeiconsData: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "icon-search-"));
  fetcher = new FakeFetcher();
  hugeiconsData = join(root, "hugeicons-icons.json");
  writeFileSync(hugeiconsData, JSON.stringify(shippedList));
});

const refreshHuge = (now = NOW) => refreshCatalog(root, "hugeicons", fetcher, now, { hugeiconsData });

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("Hugeicons refresh", () => {
  it("downloads the drawings from npm and names and tags them from the shipped list", async () => {
    const catalog = await refreshHuge();
    expect(catalog.icons.map((icon) => [icon.name, icon.exportName, icon.file, icon.tags])).toEqual([
      ["3d-view", "ThreeDViewIcon", "svg-9-4.3.5/ThreeDViewIcon.svg", ["cube"]],
      ["add-01", "Add01Icon", "svg-9-4.3.5/Add01Icon.svg", ["plus", "add"]],
    ]);
    expect(catalog.dropped).toEqual([]);
    expect(catalog.newNames).toEqual(["3d-view"]);
    expect(readCatalog(root, "hugeicons")).toEqual(catalog);
    expect(readdirSync(join(root, "hugeicons")).sort()).toEqual(["catalog.json", "svg-9-4.3.5"]);

    const tile = readFileSync(join(root, "hugeicons", catalog.icons[0].file), "utf8");
    expect(tile).toContain('stroke="#000"');
    const copy = readCopySvg(root, "hugeicons", catalog.icons[0]);
    expect(copy).toContain('stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"');
    expect(copy).not.toContain("#000");
  });

  it("never asks hugeicons.com for anything", async () => {
    await refreshHuge();
    expect(fetcher.calls.filter((url) => url.includes("hugeicons.com"))).toEqual([]);
  });

  it("reuses the drawings when the package hasn't changed", async () => {
    await refreshHuge();
    fetcher.calls = [];
    await refreshHuge(NOW + STALE_AFTER_MS);
    expect(fetcher.calls).toEqual([URLS.hugeiconsLatest]);
  });

  it("says so when the shipped list is missing", async () => {
    await expect(refreshCatalog(root, "hugeicons", fetcher, NOW)).rejects.toThrow("Hugeicons list is missing");
  });

  it("swaps in a new package version and clears the old drawings", async () => {
    await refreshHuge();
    fetcher.responses[URLS.hugeiconsLatest] = { version: "4.4.0", dist: { tarball: TARBALL, integrity: INTEGRITY } };
    const catalog = await refreshHuge(NOW + 1);
    expect(catalog.drawingsVersion).toBe("4.4.0");
    expect(readdirSync(join(root, "hugeicons")).sort()).toEqual(["catalog.json", "svg-9-4.4.0"]);
  });

  it("keeps the last catalog when offline", async () => {
    const first = await refreshHuge();
    fetcher.failing.add(URLS.hugeiconsLatest);
    await expect(refreshHuge(NOW + 1)).rejects.toThrow("offline");
    expect(readCatalog(root, "hugeicons")).toEqual(first);
  });

  it("leaves no half-written drawings when the download fails", async () => {
    fetcher.failing.add(TARBALL);
    await expect(refreshHuge()).rejects.toThrow("offline");
    expect(readCatalog(root, "hugeicons")).toBeUndefined();
    expect(existsSync(join(root, "hugeicons", "svg-9-4.3.5"))).toBe(false);
  });

  it("refuses a download that doesn't match npm's checksum, and keeps no part of it", async () => {
    fetcher.responses[URLS.hugeiconsLatest] = {
      version: "4.3.5",
      dist: { tarball: TARBALL, integrity: `sha512-${createHash("sha512").update("other").digest("base64")}` },
    };
    await expect(refreshHuge()).rejects.toThrow("checksum");
    expect(readdirSync(join(root, "hugeicons"))).toEqual([]);
  });

  it("refuses a release without a sha512 checksum", async () => {
    fetcher.responses[URLS.hugeiconsLatest] = { version: "4.3.5", dist: { tarball: TARBALL, integrity: "sha1-abc=" } };
    await expect(refreshHuge()).rejects.toThrow("no usable");
  });

  it("refuses a tarball from anywhere but npm", async () => {
    fetcher.responses[URLS.hugeiconsLatest] = { version: "4.3.5", dist: { tarball: "https://evil.example/x.tgz" } };
    await expect(refreshHuge()).rejects.toThrow("no usable");
  });
});

describe("Lucide refresh", () => {
  it("writes the drawings and finds the New set", async () => {
    const catalog = await refreshCatalog(root, "lucide", fetcher, NOW);
    expect(catalog.icons.map((icon) => icon.name)).toEqual(["broom", "hand", "ticket"]);
    expect(catalog.newNames).toEqual(["broom"]);
    expect(catalog.baselineVersion).toBe("1.23.0");
    expect(readCopySvg(root, "lucide", catalog.icons[2])).toContain('stroke="currentColor" stroke-width="2"');
  });

  it("writes one centered tile per icon", async () => {
    const catalog = await refreshCatalog(root, "lucide", fetcher, NOW);
    const ticket = catalog.icons[2];
    expect(tilePath(root, "lucide", ticket)).toBe(join(root, "lucide", ticket.file));
    expect(readFileSync(tilePath(root, "lucide", ticket), "utf8")).toContain('viewBox="-4.00 -4.00 32 32"');
    expect(existsSync(tilePath(root, "lucide", ticket).replace(/\.svg$/, ".labeled.svg"))).toBe(false);
  });

  it("fetches the old release's tags only when the baseline moves", async () => {
    await refreshCatalog(root, "lucide", fetcher, NOW);
    fetcher.calls = [];
    await refreshCatalog(root, "lucide", fetcher, NOW + STALE_AFTER_MS);
    expect(fetcher.calls).not.toContain(URLS.lucideTagsAt("1.23.0"));
    expect(readdirSync(join(root, "lucide")).filter((entry) => entry.startsWith("svg-"))).toEqual([
      `svg-9-${NOW + STALE_AFTER_MS}`,
    ]);
  });

  it("keeps the last New set when npm is unreachable", async () => {
    await refreshCatalog(root, "lucide", fetcher, NOW);
    fetcher.failing.add(URLS.lucideRegistry);
    expect((await refreshCatalog(root, "lucide", fetcher, NOW + 1)).newNames).toEqual(["broom"]);
  });
});

describe("cache helpers", () => {
  it("treats a missing, day-old, or future catalog as stale", async () => {
    const catalog = await refreshCatalog(root, "lucide", fetcher, NOW);
    expect(isStale(undefined, NOW)).toBe(true);
    expect(isStale(catalog, NOW + STALE_AFTER_MS - 1)).toBe(false);
    expect(isStale(catalog, NOW + STALE_AFTER_MS)).toBe(true);
    expect(isStale(catalog, NOW - 1)).toBe(true);
  });

  it("treats tiles drawn in an older format as stale", async () => {
    const catalog = await refreshCatalog(root, "lucide", fetcher, NOW);
    const older = {
      ...catalog,
      icons: catalog.icons.map((icon) => ({ ...icon, file: icon.file.replace(/^svg-\d+-/, "svg-1-") })),
    };
    expect(isStale(older, NOW)).toBe(true);
  });

  it("reads nothing from an empty or corrupt cache", () => {
    expect(readCatalog(root, "lucide")).toBeUndefined();
  });

  it("never overwrites a saved file", () => {
    const taken = new Set(["ticket.svg", "ticket 2.svg"]);
    expect(freeFileName("ticket", (name) => taken.has(name))).toBe("ticket 3.svg");
    expect(freeFileName("hand", (name) => taken.has(name))).toBe("hand.svg");
  });

  it("keeps a saved file inside its folder whatever the icon is called", () => {
    const none = () => false;
    expect(freeFileName("../../Library/evil", none)).toBe("Library-evil.svg");
    expect(freeFileName("a/b", none)).toBe("a-b.svg");
    expect(freeFileName(".hidden", none)).toBe("hidden.svg");
    expect(freeFileName("re:", none)).toBe("re-.svg");
    expect(freeFileName("c++", none)).toBe("c++.svg");
    expect(freeFileName("///", none)).toBe("icon.svg");
  });
});

describe("a fresh install", () => {
  it("starts from an empty support folder: nothing saved, then a full download of each library", async () => {
    const empty = mkdtempSync(join(tmpdir(), "icon-search-empty-"));
    try {
      expect(readdirSync(empty)).toEqual([]);
      expect(readCatalog(empty, "lucide")).toBeUndefined();
      expect(readCatalog(empty, "hugeicons")).toBeUndefined();
      expect(isStale(readCatalog(empty, "lucide"), NOW)).toBe(true);
      const lucide = await refreshCatalog(empty, "lucide", fetcher, NOW);
      const huge = await refreshCatalog(empty, "hugeicons", fetcher, NOW, { hugeiconsData });
      expect(lucide.icons.length).toBeGreaterThan(0);
      expect(huge.icons.length).toBeGreaterThan(0);
      expect(readCatalog(empty, "hugeicons")).toEqual(huge);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("offline with an empty folder: the refresh fails with a message and leaves nothing half-written", async () => {
    const empty = mkdtempSync(join(tmpdir(), "icon-search-empty-"));
    try {
      fetcher.failing.add(URLS.lucideTags);
      fetcher.failing.add(URLS.hugeiconsLatest);
      await expect(refreshCatalog(empty, "lucide", fetcher, NOW)).rejects.toThrow("offline");
      await expect(refreshCatalog(empty, "hugeicons", fetcher, NOW, { hugeiconsData })).rejects.toThrow("offline");
      expect(readCatalog(empty, "lucide")).toBeUndefined();
      expect(readdirSync(join(empty, "hugeicons"))).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
