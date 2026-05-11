/**
 * Tests for the property price service.
 *
 * Covers:
 * - Postcode format validation (client-side, no API call)
 * - Region resolution from postcodes.io (mocked)
 * - HPI data fetching from Land Registry (mocked)
 * - Property price change calculation (end-to-end with mocks)
 * - Caching behaviour
 * - Error handling (invalid postcodes, unsupported regions, API failures)
 *
 * All external API calls (postcodes.io and Land Registry) are mocked
 * using Jest's global fetch mock. No real network requests are made.
 */

import { validatePostcodeFormat } from "../services/property-price";

// ──────────────────────────────────────────
// Mock Setup
// ──────────────────────────────────────────

// Mock @raycast/api Cache (same pattern as other test files)
const mockCacheStore = new Map<string, string>();

jest.mock("@raycast/api", () => ({
  Cache: jest.fn().mockImplementation(() => ({
    get: (key: string) => mockCacheStore.get(key) ?? undefined,
    set: (key: string, value: string) => mockCacheStore.set(key, value),
    has: (key: string) => mockCacheStore.has(key),
    remove: (key: string) => mockCacheStore.delete(key),
    clear: () => mockCacheStore.clear(),
  })),
  Color: {
    Blue: "blue",
    Purple: "purple",
    Orange: "orange",
    Green: "green",
    Magenta: "magenta",
    Yellow: "yellow",
    Red: "red",
    SecondaryText: "secondaryText",
    PrimaryText: "primaryText",
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ──────────────────────────────────────────
// Sample API Responses
// ──────────────────────────────────────────

/** Sample postcodes.io response for a London postcode */
const LONDON_POSTCODE_RESPONSE = {
  status: 200,
  result: {
    postcode: "SW1A 1AA",
    quality: 1,
    eastings: 529090,
    northings: 179645,
    country: "England",
    nhs_ha: "London",
    longitude: -0.141588,
    latitude: 51.501009,
    european_electoral_region: "London",
    primary_care_trust: "Westminster",
    region: "London",
    lsoa: "Westminster 018C",
    msoa: "Westminster 018",
    incode: "1AA",
    outcode: "SW1A",
    parliamentary_constituency: "Cities of London and Westminster",
    admin_district: "City of Westminster",
    parish: "City of Westminster, unparished area",
    admin_county: null,
    admin_ward: "St James's",
    ced: null,
    ccg: "NHS North West London",
    nuts: "Westminster",
    codes: {},
  },
};

/** Sample postcodes.io response for a Welsh postcode */
const WALES_POSTCODE_RESPONSE = {
  status: 200,
  result: {
    postcode: "CF10 1AA",
    quality: 1,
    country: "Wales",
    region: null,
    admin_district: "Cardiff",
    outcode: "CF10",
    incode: "1AA",
    longitude: -3.17909,
    latitude: 51.47873,
    codes: {},
  },
};

/** Sample postcodes.io response for a Scottish postcode */
const SCOTLAND_POSTCODE_RESPONSE = {
  status: 200,
  result: {
    postcode: "EH1 1AA",
    quality: 1,
    country: "Scotland",
    region: null,
    admin_district: "City of Edinburgh",
    outcode: "EH1",
    incode: "1AA",
    codes: {},
  },
};

/** Sample postcodes.io response for a Northern Ireland postcode */
const NI_POSTCODE_RESPONSE = {
  status: 200,
  result: {
    postcode: "BT1 1AA",
    quality: 1,
    country: "Northern Ireland",
    region: null,
    admin_district: "Belfast",
    outcode: "BT1",
    incode: "1AA",
    codes: {},
  },
};

/** Sample postcodes.io response for a Manchester (North West) postcode */
const MANCHESTER_POSTCODE_RESPONSE = {
  status: 200,
  result: {
    postcode: "M1 1AA",
    quality: 1,
    country: "England",
    region: "North West",
    admin_district: "Manchester",
    outcode: "M1",
    incode: "1AA",
    longitude: -2.23743,
    latitude: 53.4776,
    codes: {},
  },
};

/**
 * Builds a sample SPARQL JSON response from the Land Registry.
 * Returns HPI data points for a region.
 */
function buildHPIResponse(dataPoints: Array<{ date: string; hpi: number }>) {
  return {
    results: {
      bindings: dataPoints.map((dp) => ({
        date: {
          type: "literal",
          value: dp.date,
          datatype: "http://www.w3.org/2001/XMLSchema#gYearMonth",
        },
        hpi: {
          type: "typed-literal",
          value: dp.hpi.toString(),
          datatype: "http://www.w3.org/2001/XMLSchema#decimal",
        },
      })),
    },
  };
}

/** Sample HPI data for London (realistic index values) */
const LONDON_HPI_DATA = [
  { date: "2023-01", hpi: 148.2 },
  { date: "2023-02", hpi: 148.5 },
  { date: "2023-03", hpi: 149.1 },
  { date: "2023-04", hpi: 149.8 },
  { date: "2023-05", hpi: 150.3 },
  { date: "2023-06", hpi: 150.7 },
  { date: "2023-07", hpi: 151.0 },
  { date: "2023-08", hpi: 151.4 },
  { date: "2023-09", hpi: 151.8 },
  { date: "2023-10", hpi: 152.1 },
  { date: "2023-11", hpi: 152.5 },
  { date: "2023-12", hpi: 153.0 },
  { date: "2024-01", hpi: 153.5 },
  { date: "2024-02", hpi: 154.0 },
  { date: "2024-03", hpi: 154.8 },
  { date: "2024-04", hpi: 155.3 },
  { date: "2024-05", hpi: 155.9 },
  { date: "2024-06", hpi: 156.5 },
];

/** Sample HPI data for Wales */
const WALES_HPI_DATA = [
  { date: "2023-06", hpi: 130.0 },
  { date: "2023-12", hpi: 132.5 },
  { date: "2024-06", hpi: 135.0 },
];

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/**
 * Creates a mock fetch Response.
 */
function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => mockJsonResponse(body, status) as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array(),
  } as unknown as Response;
}

/**
 * Sets up fetch to respond to postcodes.io and Land Registry calls.
 */
function setupFetchMocks(options?: {
  postcodeResponse?: unknown;
  postcodeStatus?: number;
  hpiResponse?: unknown;
  hpiStatus?: number;
}) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("api.postcodes.io")) {
      return mockJsonResponse(options?.postcodeResponse ?? LONDON_POSTCODE_RESPONSE, options?.postcodeStatus ?? 200);
    }
    if (url.includes("landregistry.data.gov.uk")) {
      return mockJsonResponse(options?.hpiResponse ?? buildHPIResponse(LONDON_HPI_DATA), options?.hpiStatus ?? 200);
    }
    return mockJsonResponse({ error: "Unknown URL" }, 500);
  });
}

// ──────────────────────────────────────────
// Tests: validatePostcodeFormat
// ──────────────────────────────────────────

describe("validatePostcodeFormat", () => {
  describe("valid postcodes", () => {
    const validPostcodes = [
      "SW1A 1AA",
      "sw1a 1aa",
      "SW1A1AA",
      "EC1A 1BB",
      "W1A 0AX",
      "M1 1AE",
      "B33 8TH",
      "CR2 6XH",
      "DN55 1PT",
      "CF10 1AA",
      "BT1 1AA",
      "EH1 1YZ",
      "LS1 1BA",
    ];

    it.each(validPostcodes)("accepts valid postcode: %s", (postcode) => {
      expect(validatePostcodeFormat(postcode)).toBeUndefined();
    });
  });

  describe("invalid postcodes", () => {
    it("rejects empty string", () => {
      expect(validatePostcodeFormat("")).toBe("Postcode is required");
    });

    it("rejects whitespace only", () => {
      expect(validatePostcodeFormat("   ")).toBe("Postcode is required");
    });

    it("rejects random text", () => {
      const result = validatePostcodeFormat("hello world");
      expect(result).toBeDefined();
      expect(result).toContain("valid UK postcode");
    });

    it("rejects numeric only", () => {
      const result = validatePostcodeFormat("12345");
      expect(result).toBeDefined();
    });

    it("rejects US zip codes", () => {
      const result = validatePostcodeFormat("90210");
      expect(result).toBeDefined();
    });

    it("rejects partial postcodes (outcode only)", () => {
      const result = validatePostcodeFormat("SW1A");
      expect(result).toBeDefined();
    });

    it("rejects postcodes with special characters", () => {
      const result = validatePostcodeFormat("SW1A-1AA");
      expect(result).toBeDefined();
    });
  });
});

// ──────────────────────────────────────────
// Tests: getRegionForPostcode
// ──────────────────────────────────────────

describe("getRegionForPostcode", () => {
  // Dynamically import to ensure mocks are applied
  let getRegionForPostcode: typeof import("../services/property-price").getRegionForPostcode;

  beforeAll(async () => {
    const mod = await import("../services/property-price");
    getRegionForPostcode = mod.getRegionForPostcode;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockCacheStore.clear();
  });

  it("resolves a London postcode to the london region slug", async () => {
    setupFetchMocks({ postcodeResponse: LONDON_POSTCODE_RESPONSE });

    const result = await getRegionForPostcode("SW1A 1AA");
    expect(result.region).toBe("London");
    expect(result.slug).toBe("london");
  });

  it("resolves a Manchester postcode to north-west region slug", async () => {
    setupFetchMocks({ postcodeResponse: MANCHESTER_POSTCODE_RESPONSE });

    const result = await getRegionForPostcode("M1 1AA");
    expect(result.region).toBe("North West");
    expect(result.slug).toBe("north-west");
  });

  it("resolves a Welsh postcode to the wales region slug", async () => {
    setupFetchMocks({ postcodeResponse: WALES_POSTCODE_RESPONSE });

    const result = await getRegionForPostcode("CF10 1AA");
    expect(result.region).toBe("Wales");
    expect(result.slug).toBe("wales");
  });

  it("throws for a Scottish postcode", async () => {
    setupFetchMocks({ postcodeResponse: SCOTLAND_POSTCODE_RESPONSE });

    await expect(getRegionForPostcode("EH1 1AA")).rejects.toThrow(/Scottish postcodes are not yet supported/);
  });

  it("throws for a Northern Ireland postcode", async () => {
    setupFetchMocks({ postcodeResponse: NI_POSTCODE_RESPONSE });

    await expect(getRegionForPostcode("BT1 1AA")).rejects.toThrow(/Northern Ireland postcodes are not yet supported/);
  });

  it("throws for an invalid postcode (404 from API)", async () => {
    setupFetchMocks({ postcodeStatus: 404 });

    await expect(getRegionForPostcode("ZZ99 9ZZ")).rejects.toThrow(/Invalid postcode/);
  });

  it("throws for an API failure (500 from API)", async () => {
    setupFetchMocks({ postcodeStatus: 500 });

    await expect(getRegionForPostcode("SW1A 1AA")).rejects.toThrow(/Postcode lookup failed/);
  });

  it("caches the region mapping after first call", async () => {
    setupFetchMocks({ postcodeResponse: LONDON_POSTCODE_RESPONSE });

    // First call — hits the API
    await getRegionForPostcode("SW1A 1AA");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result = await getRegionForPostcode("SW1A 1AA");
    expect(result.region).toBe("London");
    // fetch should NOT have been called again
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("normalises postcode for cache key (spaces and case)", async () => {
    setupFetchMocks({ postcodeResponse: LONDON_POSTCODE_RESPONSE });

    // First call with spaces
    await getRegionForPostcode("SW1A 1AA");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call without spaces — should still hit cache
    const result = await getRegionForPostcode("sw1a1aa");
    expect(result.region).toBe("London");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────
// Tests: getPropertyPriceChange
// ──────────────────────────────────────────

describe("getPropertyPriceChange", () => {
  let getPropertyPriceChange: typeof import("../services/property-price").getPropertyPriceChange;

  beforeAll(async () => {
    const mod = await import("../services/property-price");
    getPropertyPriceChange = mod.getPropertyPriceChange;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockCacheStore.clear();
  });

  it("calculates the correct percentage change for London", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-01-15");

    // Valuation month: 2023-01 (HPI: 148.2)
    // Latest month: 2024-06 (HPI: 156.5)
    // Change: (156.5 - 148.2) / 148.2 * 100 = ~5.60%
    expect(result.changePercent).toBeCloseTo(5.6, 0);
    expect(result.region).toBe("London");
    expect(result.regionSlug).toBe("london");
    expect(result.valuationHPI).toBe(148.2);
    expect(result.latestHPI).toBe(156.5);
  });

  it("calculates the correct percentage change for Wales", async () => {
    setupFetchMocks({
      postcodeResponse: WALES_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(WALES_HPI_DATA),
    });

    const result = await getPropertyPriceChange("CF10 1AA", "2023-06-15");

    // Valuation month: 2023-06 (HPI: 130.0)
    // Latest month: 2024-06 (HPI: 135.0)
    // Change: (135.0 - 130.0) / 130.0 * 100 = ~3.85%
    expect(result.changePercent).toBeCloseTo(3.85, 1);
    expect(result.region).toBe("Wales");
  });

  it("handles a negative price change (depreciation)", async () => {
    const depreciatingData = [
      { date: "2023-06", hpi: 150.0 },
      { date: "2024-06", hpi: 142.5 },
    ];
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(depreciatingData),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-06-01");

    // (142.5 - 150.0) / 150.0 * 100 = -5%
    expect(result.changePercent).toBeCloseTo(-5.0, 1);
  });

  it("handles zero change", async () => {
    const flatData = [
      { date: "2023-06", hpi: 150.0 },
      { date: "2024-06", hpi: 150.0 },
    ];
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(flatData),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-06-01");
    expect(result.changePercent).toBeCloseTo(0, 1);
  });

  it("finds the closest HPI month when exact match is not available", async () => {
    // Data only has Jan and Mar — valuation date is Feb
    const sparseData = [
      { date: "2023-01", hpi: 100.0 },
      { date: "2023-03", hpi: 102.0 },
      { date: "2024-06", hpi: 110.0 },
    ];
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(sparseData),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-02-15");

    // Should use 2023-01 (closest within 3-month tolerance)
    // Change: (110.0 - 100.0) / 100.0 * 100 = 10%
    expect(result.changePercent).toBeCloseTo(10.0, 1);
    expect(result.valuationHPI).toBe(100.0);
  });

  it("throws when no HPI data is available for the region", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse([]),
    });

    await expect(getPropertyPriceChange("SW1A 1AA", "2023-06-01")).rejects.toThrow(/No UK HPI data available/);
  });

  it("throws for an invalid valuation date", async () => {
    setupFetchMocks();

    await expect(getPropertyPriceChange("SW1A 1AA", "not-a-date")).rejects.toThrow(/Invalid valuation date/);
  });

  it("throws when Land Registry API returns an error", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiStatus: 500,
    });

    await expect(getPropertyPriceChange("SW1A 1AA", "2023-06-01")).rejects.toThrow(/Failed to fetch UK HPI data/);
  });

  it("includes a fetchedAt timestamp in the result", async () => {
    setupFetchMocks();

    const before = new Date().toISOString();
    const result = await getPropertyPriceChange("SW1A 1AA", "2023-01-15");
    const after = new Date().toISOString();

    expect(result.fetchedAt).toBeDefined();
    expect(result.fetchedAt >= before).toBe(true);
    expect(result.fetchedAt <= after).toBe(true);
  });

  it("includes valuation and latest month strings", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    expect(result.valuationMonth).toBe("2023-06");
    expect(result.latestMonth).toBe("2024-06");
  });

  it("caches HPI data after first call", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    // First call
    await getPropertyPriceChange("SW1A 1AA", "2023-06-15");
    const callCount = mockFetch.mock.calls.length;

    // Second call with same postcode but different valuation date
    // Should use cached HPI data (same region, same day)
    await getPropertyPriceChange("SW1A 1AA", "2023-01-15");

    // Only the postcode lookup is cached (1 call), HPI might still use cache
    // But the postcode region cache means the postcodes.io call is skipped
    // The HPI data for today is cached, so no new Land Registry call
    // Net: no new fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(callCount);
  });
});

// ──────────────────────────────────────────
// Tests: getPropertyPriceChangeSync
// ──────────────────────────────────────────

describe("getPropertyPriceChangeSync", () => {
  let getPropertyPriceChangeSync: typeof import("../services/property-price").getPropertyPriceChangeSync;
  let getPropertyPriceChange: typeof import("../services/property-price").getPropertyPriceChange;

  beforeAll(async () => {
    const mod = await import("../services/property-price");
    getPropertyPriceChangeSync = mod.getPropertyPriceChangeSync;
    getPropertyPriceChange = mod.getPropertyPriceChange;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockCacheStore.clear();
  });

  it("returns undefined when no cached data exists", () => {
    const result = getPropertyPriceChangeSync("SW1A 1AA", "2023-06-15");
    expect(result).toBeUndefined();
  });

  it("returns cached data after an async fetch has populated the cache", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    // Populate cache via async call
    const asyncResult = await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    // Sync call should now return data
    const syncResult = getPropertyPriceChangeSync("SW1A 1AA", "2023-06-15");
    expect(syncResult).toBeDefined();
    expect(syncResult!.changePercent).toBeCloseTo(asyncResult.changePercent, 2);
    expect(syncResult!.region).toBe(asyncResult.region);
  });

  it("returns undefined for a different postcode not yet cached", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    // Cache London data
    await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    // Manchester is not cached
    const result = getPropertyPriceChangeSync("M1 1AA", "2023-06-15");
    expect(result).toBeUndefined();
  });

  it("returns undefined for an invalid valuation date", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    const result = getPropertyPriceChangeSync("SW1A 1AA", "invalid-date");
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────
// Tests: Integration (Postcode → Region → HPI → Change)
// ──────────────────────────────────────────

describe("end-to-end integration", () => {
  let getPropertyPriceChange: typeof import("../services/property-price").getPropertyPriceChange;

  beforeAll(async () => {
    const mod = await import("../services/property-price");
    getPropertyPriceChange = mod.getPropertyPriceChange;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockCacheStore.clear();
  });

  it("makes exactly 2 fetch calls: postcodes.io + Land Registry", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    await getPropertyPriceChange("SW1A 1AA", "2023-01-15");

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call should be to postcodes.io
    const firstCallUrl = mockFetch.mock.calls[0][0] as string;
    expect(firstCallUrl).toContain("api.postcodes.io");

    // Second call should be to Land Registry
    const secondCallUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("landregistry.data.gov.uk");
  });

  it("Land Registry query includes the correct region slug", async () => {
    setupFetchMocks({
      postcodeResponse: MANCHESTER_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    await getPropertyPriceChange("M1 1AA", "2023-01-15");

    // The SPARQL query should reference the north-west region
    const lrCallUrl = mockFetch.mock.calls[1][0] as string;
    expect(lrCallUrl).toContain("north-west");
  });

  it("returns a complete PropertyPriceChange object", async () => {
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    const result = await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    // Verify all required fields are present
    expect(typeof result.changePercent).toBe("number");
    expect(typeof result.region).toBe("string");
    expect(typeof result.regionSlug).toBe("string");
    expect(typeof result.valuationMonth).toBe("string");
    expect(typeof result.latestMonth).toBe("string");
    expect(typeof result.valuationHPI).toBe("number");
    expect(typeof result.latestHPI).toBe("number");
    expect(typeof result.fetchedAt).toBe("string");

    // Verify values make sense
    expect(result.region).toBe("London");
    expect(result.regionSlug).toBe("london");
    expect(result.valuationMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(result.latestMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(result.valuationHPI).toBeGreaterThan(0);
    expect(result.latestHPI).toBeGreaterThan(0);
  });

  it("subsequent calls for the same region use cached data", async () => {
    // Two different postcodes in London
    setupFetchMocks({
      postcodeResponse: LONDON_POSTCODE_RESPONSE,
      hpiResponse: buildHPIResponse(LONDON_HPI_DATA),
    });

    const result1 = await getPropertyPriceChange("SW1A 1AA", "2023-06-15");

    // Reset fetch mock to track new calls
    const firstCallCount = mockFetch.mock.calls.length;

    // Same postcode, different valuation date — HPI cache should still apply
    const result2 = await getPropertyPriceChange("SW1A 1AA", "2023-01-15");

    // No new fetch calls (both postcode region and HPI data are cached)
    expect(mockFetch).toHaveBeenCalledTimes(firstCallCount);

    // Results should have different change percentages due to different valuation dates
    expect(result1.changePercent).not.toBe(result2.changePercent);
  });
});
