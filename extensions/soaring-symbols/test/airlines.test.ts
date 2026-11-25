// Run with `npm test` (Node's built-in test runner, which strips the types).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aliasNames,
  airlinesUrl,
  countryName,
  earlierMarks,
  flagCarrierCountries,
  formerNames,
  getAssetTiles,
  tileKind,
  typeSections,
  previewSource,
  previewUrl,
  groupAirlines,
  markTitle,
  searchKeywords,
  isAirlineList,
  isLineRelease,
  setDataVersion,
  DATA_LINE,
} from "../src/utils/airlines.ts";

// Releases of the line the extension reads, and of other lines, so moving
// DATA_LINE to a new line needs no change here
const [major, minor] = DATA_LINE.split(".").map(Number);
const release = (patch: number) => `${DATA_LINE}.${patch}`;
const nextLine = `${major}.${minor + 1}.0`;
const earlierLine = `${major}.${Math.max(minor - 1, 0)}.9`;

const airline = { name: "Vietnam Airlines", slug: "vietnam-airlines", assets: { logo: { color: true, mono: true } } };

describe("isAirlineList", () => {
  it("accepts a list of airlines with slugs and assets", () => {
    assert.equal(isAirlineList([airline, { ...airline, slug: "qantas", assets: {} }]), true);
  });

  it("rejects an empty list, so the bundled one is used instead", () => {
    assert.equal(isAirlineList([]), false);
  });

  it("rejects anything that isn't a list", () => {
    for (const data of [null, undefined, {}, "airlines", { airlines: [airline] }]) {
      assert.equal(isAirlineList(data), false, JSON.stringify(data));
    }
  });

  it("rejects a list with an entry missing its slug or assets", () => {
    assert.equal(isAirlineList([airline, { ...airline, slug: undefined }]), false);
    assert.equal(isAirlineList([airline, { ...airline, assets: undefined }]), false);
    assert.equal(isAirlineList([airline, { ...airline, assets: null }]), false);
    assert.equal(isAirlineList([airline, null]), false);
  });
});

describe("groupAirlines", () => {
  const parent = { ...airline, name: "AirAsia", slug: "airasia" };
  const thai = { ...airline, name: "Thai AirAsia", slug: "thai-airasia", parent: "airasia" };
  const indonesia = { ...airline, name: "Indonesia AirAsia", slug: "indonesia-airasia", parent: "airasia" };

  it("finds each airline's parent and each parent's subsidiaries", () => {
    const { parents, subsidiaries } = groupAirlines([parent, thai, indonesia, airline]);
    assert.equal(parents.get("thai-airasia"), parent);
    assert.deepEqual(subsidiaries.get("airasia"), [thai, indonesia]);
    assert.equal(parents.get("vietnam-airlines"), undefined);
    assert.equal(subsidiaries.get("vietnam-airlines"), undefined);
  });

  it("skips a parent that isn't in the list", () => {
    const { parents, subsidiaries } = groupAirlines([thai]);
    assert.equal(parents.size, 0);
    assert.equal(subsidiaries.size, 0);
  });
});

describe("getAssetTiles and earlierMarks", () => {
  const info = (color: boolean, mono: boolean) => ({ color, mono, colors: [] });
  const korean = {
    ...airline,
    name: "Korean Air",
    slug: "korean-air",
    assets: { logo: info(true, true) },
    history: [
      { since: 1969, assets: { logo: info(true, false) } },
      { since: 1984, assets: { logo: info(true, false), icon: info(true, true) } },
    ],
  };
  const base = `https://cdn.jsdelivr.net/npm/soaring-symbols@${DATA_LINE}/dist/assets/korean-air`;

  it("lists the current files without a mark", () => {
    assert.deepEqual(
      getAssetTiles(korean).map(({ url, fileName }) => [url, fileName]),
      [
        [`${base}/logo.svg`, "korean-air-logo.svg"],
        [`${base}/logo-mono.svg`, "korean-air-logo-mono.svg"],
      ],
    );
  });

  it("lists an older mark's files from its history folder", () => {
    const [newest] = earlierMarks(korean);
    assert.equal(newest.since, 1984);
    assert.deepEqual(
      getAssetTiles(korean, newest).map(({ url, fileName, mono }) => [url, fileName, mono]),
      [
        [`${base}/history/1984/logo.svg`, "korean-air-1984-logo.svg", false],
        [`${base}/history/1984/icon.svg`, "korean-air-1984-icon.svg", false],
        [`${base}/history/1984/icon-mono.svg`, "korean-air-1984-icon-mono.svg", true],
      ],
    );
  });

  it("lists a stacked logo after the logo", () => {
    const stacked = {
      ...korean,
      assets: { logo: info(true, false), "logo-stacked": info(true, true), icon: info(true, false) },
    };
    assert.deepEqual(
      getAssetTiles(stacked).map(({ variant, fileName, mono }) => [variant, fileName, mono]),
      [
        ["logo", "korean-air-logo.svg", false],
        ["logo-stacked", "korean-air-logo-stacked.svg", false],
        ["logo-stacked-mono", "korean-air-logo-stacked-mono.svg", true],
        ["icon", "korean-air-icon.svg", false],
      ],
    );
  });

  it("gives a color tile its -dark.svg when the data ships one", () => {
    const withDark = { ...korean, assets: { logo: { ...info(true, true), dark: true } } };
    const [color, mono] = getAssetTiles(withDark);
    assert.deepEqual(color.dark, { url: `${base}/logo-dark.svg`, fileName: "korean-air-logo-dark.svg" });
    assert.equal(mono.dark, undefined);
    // Data from before 0.5.0 has no dark files
    assert.equal(getAssetTiles(korean)[0].dark, undefined);
  });

  it("previews the -dark.svg in dark mode when there is one", () => {
    const withDark = { ...korean, assets: { logo: { ...info(true, true), dark: true } } };
    assert.equal(previewUrl(withDark, "logo", { dark: true }), `${base}/logo-dark.svg`);
    assert.equal(previewUrl(withDark, "logo"), `${base}/logo.svg`);
    assert.equal(previewUrl(korean, "logo", { dark: true }), `${base}/logo.svg`);
  });

  it("gives a preview source that follows the theme when there is a -dark.svg", () => {
    const withDark = { ...korean, assets: { logo: { ...info(true, true), dark: true } } };
    assert.deepEqual(previewSource(withDark, "logo"), {
      light: `${base}/logo.svg`,
      dark: `${base}/logo-dark.svg`,
    });
    assert.equal(previewSource(korean, "logo"), `${base}/logo.svg`);
    assert.equal(previewSource(korean, "tail"), undefined);
  });

  it("groups the files by mark type, color then mono then dark", () => {
    const withAll = {
      ...korean,
      assets: {
        logo: { ...info(true, true), dark: true },
        "logo-stacked": info(true, false),
        icon: info(true, true),
      },
    };
    const sections = (dark: boolean) =>
      typeSections(getAssetTiles(withAll), { dark }).map(({ key, title, tiles }) => [
        key,
        title,
        tiles.map((tile) => tileKind(tile.variant).title),
      ]);
    assert.deepEqual(sections(true), [
      ["logo", "Logo", ["Color", "Monochrome", "Dark Background"]],
      ["logo-stacked", "Logo Stacked", ["Color"]],
      ["icon", "Icon", ["Color", "Monochrome"]],
    ]);
    // Without `dark` (light mode), no dark tiles
    assert.deepEqual(sections(false)[0], ["logo", "Logo", ["Color", "Monochrome"]]);
  });

  it("reads a tile's type and kind from its variant", () => {
    assert.deepEqual(tileKind("logo-stacked-mono"), { type: "logo-stacked", title: "Monochrome" });
    assert.deepEqual(tileKind("icon-dark"), { type: "icon", title: "Dark Background" });
    assert.deepEqual(tileKind("logo-stacked"), { type: "logo-stacked", title: "Color" });
  });

  it("orders older marks newest first and handles data without history", () => {
    assert.deepEqual(
      earlierMarks(korean).map((mark) => mark.since),
      [1984, 1969],
    );
    assert.deepEqual(earlierMarks(airline), []);
  });
});

describe("exact release URLs", () => {
  const korean = { ...airline, name: "Korean Air", slug: "korean-air" };
  const cdn = "https://cdn.jsdelivr.net/npm/soaring-symbols";

  it("accepts only exact releases of the line", () => {
    assert.equal(isLineRelease(release(0)), true);
    for (const version of [DATA_LINE, earlierLine, nextLine, `${release(0)}-beta`, `1${release(0)}`, undefined, 24]) {
      assert.equal(isLineRelease(version), false, String(version));
    }
  });

  it("loads airlines.json from the release, or the line when it's unknown", () => {
    assert.equal(airlinesUrl(release(0)), `${cdn}@${release(0)}/dist/airlines.json`);
    assert.equal(airlinesUrl(undefined), `${cdn}@${DATA_LINE}/dist/airlines.json`);
    assert.equal(airlinesUrl("latest"), `${cdn}@${DATA_LINE}/dist/airlines.json`);
  });

  it("loads files from the release the list came from", () => {
    setDataVersion(release(1));
    assert.equal(getAssetTiles(korean)[0].url, `${cdn}@${release(1)}/dist/assets/korean-air/logo.svg`);
    setDataVersion(earlierLine);
    assert.equal(getAssetTiles(korean)[0].url, `${cdn}@${DATA_LINE}/dist/assets/korean-air/logo.svg`);
    setDataVersion();
    assert.equal(getAssetTiles(korean)[0].url, `${cdn}@${DATA_LINE}/dist/assets/korean-air/logo.svg`);
  });
});

describe("markTitle", () => {
  const trinity = { name: "Trinity Airways" } as never;
  it("gives the years an older mark was used, with a former name", () => {
    assert.equal(
      markTitle(trinity, { since: 2010, until: 2026, name: "T'way Air", assets: {} } as never),
      "T'way Air · 2010–2026",
    );
    assert.equal(
      markTitle(trinity, { since: 2010, until: 2026, name: "Trinity Airways", assets: {} } as never),
      "2010–2026",
    );
  });

  it("falls back to the year it came in for older releases", () => {
    assert.equal(markTitle(trinity, { since: 2010, assets: {} } as never), "Introduced 2010");
  });
});

describe("searchKeywords", () => {
  it("finds a renamed airline by its former names too", () => {
    const trinity = {
      ...airline,
      name: "Trinity Airways",
      slug: "trinity-airways",
      former: [
        { name: "Hansung Airlines", until: 2010 },
        { iata: "TW", until: 2011 },
        { name: "T'way Air", until: 2026 },
      ],
    };
    assert.ok(searchKeywords(trinity as never).includes("T'way Air"));
    assert.deepEqual(formerNames(trinity as never), ["Hansung Airlines", "T'way Air"]);
  });

  it("finds a cargo airline by the word cargo", () => {
    assert.ok(searchKeywords({ ...airline, cargo: true } as never).includes("cargo"));
    assert.ok(!searchKeywords(airline as never).includes("cargo"));
  });

  it("finds an airline by its aliases", () => {
    const swiss = {
      ...airline,
      name: "Swiss International Air Lines",
      slug: "swiss-international-air-lines",
      aliases: [{ name: "SWISS", slug: "swiss" }],
    };
    assert.ok(searchKeywords(swiss as never).includes("SWISS"));
    assert.deepEqual(aliasNames(swiss as never), ["SWISS"]);
    assert.deepEqual(aliasNames(airline as never), []);
  });
});

describe("flagCarrierCountries", () => {
  it("lists every country of a joint flag carrier", () => {
    assert.deepEqual(flagCarrierCountries({ country: "SE", flag_carrier_countries: ["DK", "NO", "SE"] }), [
      "DK",
      "NO",
      "SE",
    ]);
  });

  it("gives any other flag carrier its own country", () => {
    assert.deepEqual(flagCarrierCountries({ country: "VN" }), ["VN"]);
  });
});

describe("countryName", () => {
  it("names a country by its code", () => {
    assert.equal(countryName("SE"), "Sweden");
    assert.equal(countryName("VN"), "Vietnam");
  });

  it("keeps a code Intl can't name", () => {
    assert.equal(countryName("GB-SCT"), "GB-SCT");
  });
});
