import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ entries: new Map<string, string>() }));
vi.mock("@raycast/api", () => ({
  Cache: class {
    get(key: string) {
      return mocks.entries.get(key);
    }
    set(key: string, value: string) {
      mocks.entries.set(key, value);
    }
  },
}));
import {
  cachedWhiteAirlineLogos,
  loadWhiteAirlineLogos,
} from "./white-airline-logo-store";

const COHORT = "b".repeat(64);
const LOT_WHITE = `https://cdn.withjumpseat.com/airline-logos/LOT/rasters/white/${COHORT}/192.png`;
const HOUR = 60 * 60 * 1000;
const manifest = {
  schemaVersion: 2,
  revision: "one",
  assetBaseUrl: "https://cdn.withjumpseat.com/airline-logos/",
  logos: [
    {
      code: "LOT",
      light: null,
      dark: null,
      white: {
        cohort: COHORT,
        rasters: [{ size: 192, revision: "r", bytes: 1 }],
      },
    },
  ],
};

const fetchMock = vi.fn<typeof fetch>();

function manifestResponse(etag = 'W/"one"') {
  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { ETag: etag, "Content-Type": "application/json" },
  });
}

describe("white airline logo store", () => {
  beforeEach(() => {
    mocks.entries.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("downloads the manifest once and serves it from the cache until it is due", async () => {
    fetchMock.mockResolvedValueOnce(manifestResponse());
    expect(await loadWhiteAirlineLogos(0)).toEqual({ LOT: LOT_WHITE });
    expect(cachedWhiteAirlineLogos()).toEqual({ LOT: LOT_WHITE });

    expect(await loadWhiteAirlineLogos(5 * HOUR)).toEqual({ LOT: LOT_WHITE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.withjumpseat.com/api/v1/airlines/logos/manifest/v2",
    );
    expect(init?.headers).toEqual({ Accept: "application/json" });
  });

  it("revalidates with the strong ETag and keeps the logos on 304", async () => {
    fetchMock.mockResolvedValueOnce(manifestResponse());
    await loadWhiteAirlineLogos(0);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
    expect(await loadWhiteAirlineLogos(7 * HOUR)).toEqual({ LOT: LOT_WHITE });
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({
      Accept: "application/json",
      "If-None-Match": '"one"',
    });

    expect(await loadWhiteAirlineLogos(12 * HOUR)).toEqual({ LOT: LOT_WHITE });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the last logos when a check fails and retries later", async () => {
    fetchMock.mockResolvedValueOnce(manifestResponse());
    await loadWhiteAirlineLogos(0);

    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect(await loadWhiteAirlineLogos(7 * HOUR)).toEqual({ LOT: LOT_WHITE });
    expect(await loadWhiteAirlineLogos(7 * HOUR + 60_000)).toEqual({
      LOT: LOT_WHITE,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ schemaVersion: 3 }), { status: 200 }),
    );
    expect(await loadWhiteAirlineLogos(8 * HOUR)).toEqual({ LOT: LOT_WHITE });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns no logos without a cache or a manifest", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 503 }));
    expect(await loadWhiteAirlineLogos(0)).toEqual({});
    expect(cachedWhiteAirlineLogos()).toEqual({});
  });

  it("ignores a corrupted cache entry", async () => {
    mocks.entries.set(
      "white-airline-logos-v1",
      JSON.stringify({
        etag: null,
        nextCheckAt: Number.MAX_SAFE_INTEGER,
        logos: { LOT: "https://example.com/white.png" },
      }),
    );
    expect(cachedWhiteAirlineLogos()).toEqual({});
    fetchMock.mockResolvedValueOnce(manifestResponse());
    expect(await loadWhiteAirlineLogos(0)).toEqual({ LOT: LOT_WHITE });
  });
});
