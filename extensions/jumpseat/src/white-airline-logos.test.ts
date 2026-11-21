import { describe, expect, it } from "vitest";
import {
  AIRLINE_LOGO_ASSET_BASE_URL,
  isWhiteAirlineLogos,
  parseWhiteAirlineLogos,
  trustedAirlineMenuBarIconSource,
} from "./white-airline-logos";

const COHORT =
  "e3bd350c388ba0937591815f031e07355dbf0755ff4102c54fc02116db769fe2";
const rasters = [96, 192, 512].map((size) => ({
  size,
  revision: `r${size}`,
  bytes: 10,
}));
const variant = { cohort: "a".repeat(64), rasters };
const cdn = AIRLINE_LOGO_ASSET_BASE_URL;
const lotWhite = `${cdn}LOT/rasters/white/${COHORT}/192.png`;

function manifest(logos: unknown[], overrides: object = {}) {
  return {
    schemaVersion: 2,
    revision: "one",
    assetBaseUrl: cdn,
    logos,
    ...overrides,
  };
}

describe("white airline logos from the v2 manifest", () => {
  it("takes the 192px raster of the selected white cohort", () => {
    expect(
      parseWhiteAirlineLogos(
        manifest([
          {
            code: "LOT",
            light: variant,
            dark: variant,
            white: { cohort: COHORT, rasters },
          },
        ]),
      ),
    ).toEqual({ LOT: lotWhite });
  });

  it("uses the legacy PNG when the white logo has no cohort", () => {
    expect(
      parseWhiteAirlineLogos(
        manifest([
          {
            code: "QTR",
            light: variant,
            dark: null,
            white: { cohort: null, legacy: { revision: "abc_1-2", bytes: 9 } },
          },
        ]),
      ),
    ).toEqual({ QTR: `${cdn}QTR/white.png?v=abc_1-2` });
  });

  it("leaves out logos without a white variant", () => {
    expect(
      parseWhiteAirlineLogos(
        manifest([{ code: "AAL", light: variant, dark: null }]),
      ),
    ).toEqual({});
  });

  it("builds an alias's URL from its asset folder and keys it under both codes", () => {
    expect(
      parseWhiteAirlineLogos(
        manifest([
          {
            code: "ABR",
            assetCode: "TAY",
            light: variant,
            dark: null,
            white: { cohort: COHORT, rasters },
          },
        ]),
      ),
    ).toEqual({
      ABR: `${cdn}TAY/rasters/white/${COHORT}/192.png`,
      TAY: `${cdn}TAY/rasters/white/${COHORT}/192.png`,
    });
  });

  it("keeps a folder's own entry over an alias pointing at it", () => {
    const own = { cohort: COHORT, rasters };
    const logos = parseWhiteAirlineLogos(
      manifest([
        { code: "TAY", light: variant, dark: null, white: own },
        {
          code: "ABR",
          assetCode: "TAY",
          light: variant,
          dark: null,
          white: own,
        },
      ]),
    );
    expect(logos?.TAY).toBe(`${cdn}TAY/rasters/white/${COHORT}/192.png`);
  });

  it("skips white logos it cannot turn into a trusted PNG URL", () => {
    expect(
      parseWhiteAirlineLogos(
        manifest([
          { code: "BAD", white: { cohort: "not-a-hash", rasters } },
          { code: "NOS", white: { cohort: COHORT, rasters: [rasters[0]] } },
          { code: "REV", white: { cohort: null, legacy: { revision: "a/b" } } },
          { code: "x1", white: { cohort: COHORT, rasters } },
          { code: "ALI", assetCode: "../", white: { cohort: COHORT, rasters } },
        ]),
      ),
    ).toEqual({});
  });

  it("rejects other schema versions and asset hosts", () => {
    const logos = [{ code: "LOT", white: { cohort: COHORT, rasters } }];
    expect(parseWhiteAirlineLogos(manifest(logos, { schemaVersion: 1 }))).toBe(
      undefined,
    );
    expect(
      parseWhiteAirlineLogos(
        manifest(logos, { assetBaseUrl: "https://example.com/airline-logos/" }),
      ),
    ).toBeUndefined();
    expect(parseWhiteAirlineLogos(null)).toBeUndefined();
  });

  it("validates a stored index", () => {
    expect(isWhiteAirlineLogos({ LOT: lotWhite })).toBe(true);
    expect(isWhiteAirlineLogos({ LOT: `${cdn}LOT/light.png` })).toBe(false);
    expect(isWhiteAirlineLogos({ lot: lotWhite })).toBe(false);
    expect(isWhiteAirlineLogos([])).toBe(false);
  });
});

describe("menu bar icon source", () => {
  const lot = {
    logoUrl: `${cdn}LOT/light.svg?v=3`,
    logoDarkUrl: `${cdn}LOT/dark.svg?v=3`,
  };

  it("draws the white logo on a dark menu bar and the light logo on a light one", () => {
    expect(trustedAirlineMenuBarIconSource(lot, { LOT: lotWhite })).toEqual({
      light: `${cdn}LOT/light.png?v=3`,
      dark: lotWhite,
    });
  });

  it("keeps the dark logo when the airline has no white logo", () => {
    const source = {
      light: `${cdn}LOT/light.png?v=3`,
      dark: `${cdn}LOT/dark.png?v=3`,
    };
    expect(trustedAirlineMenuBarIconSource(lot, {})).toEqual(source);
    expect(trustedAirlineMenuBarIconSource(lot, undefined)).toEqual(source);
  });

  it("finds the white logo by the folder of a brand's logo", () => {
    const white = `${cdn}TW1/rasters/white/${COHORT}/192.png`;
    expect(
      trustedAirlineMenuBarIconSource(
        { logoUrl: null, logoDarkUrl: `${cdn}TW1/dark.svg` },
        { TW1: white, LOT: lotWhite },
      ),
    ).toEqual({ light: `${cdn}TW1/dark.png`, dark: white });
  });

  it("shows no logo when the airline has none, even with a white logo", () => {
    expect(
      trustedAirlineMenuBarIconSource(
        { logoUrl: null, logoDarkUrl: null },
        { LOT: lotWhite },
      ),
    ).toBeUndefined();
  });

  it("ignores an untrusted white URL", () => {
    expect(
      trustedAirlineMenuBarIconSource(lot, {
        LOT: "https://example.com/airline-logos/LOT/white.png",
      })?.dark,
    ).toBe(`${cdn}LOT/dark.png?v=3`);
  });
});
