import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "./errors";
import { FxRates, convert, convertTotal, fetchRates, getRates, memoryFxStore, needsRates } from "./fx";
import { Http } from "./http";
import fixture from "./__fixtures__/frankfurter-v2-usd.json";

const DAY = 24 * 60 * 60 * 1000;

function fixtureHttp(): Http & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (request) => {
    calls.push(request.url);
    return request.schema.parse(fixture);
  }) as Http & { calls: string[] };
  fn.calls = calls;
  return fn;
}

const rates: FxRates = {
  base: "USD",
  date: "2026-10-08",
  rates: { EUR: 0.8913, GBP: 0.7556, JPY: 149.1 },
  fetchedAt: 0,
};

describe("fetchRates", () => {
  it("reads the v2 array response", async () => {
    const http = fixtureHttp();
    const result = await fetchRates("usd", { http, now: () => 42 });
    expect(http.calls[0]).toBe("https://api.frankfurter.dev/v2/rates?base=USD");
    expect(result.base).toBe("USD");
    expect(result.date).toBe("2026-10-08");
    expect(result.rates.EUR).toBe(0.89132);
    expect(result.fetchedAt).toBe(42);
  });

  it("rejects an empty response", async () => {
    const http: Http = async (request) => request.schema.parse([]);
    await expect(fetchRates("USD", { http, now: () => 0 })).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("getRates", () => {
  it("caches for 24 hours", async () => {
    const http = fixtureHttp();
    const store = memoryFxStore();
    let now = 1000;
    await getRates("USD", { http, store, now: () => now });
    now += DAY - 1;
    await getRates("USD", { http, store, now: () => now });
    expect(http.calls).toHaveLength(1);
    now += 2;
    await getRates("USD", { http, store, now: () => now });
    expect(http.calls).toHaveLength(2);
  });

  it("falls back to the last known rates when a refresh fails", async () => {
    const store = memoryFxStore();
    store.set({ ...rates, fetchedAt: 0 });
    const failing = vi.fn(async () => {
      throw new ProviderError("fx", "network", "offline");
    }) as unknown as Http;
    const result = await getRates("USD", { http: failing, store, now: () => 3 * DAY });
    expect(result.stale).toBe(true);
    expect(result.rates.rates.EUR).toBe(0.8913);
  });

  it("throws when there is nothing to fall back to", async () => {
    const failing = (async () => {
      throw new ProviderError("fx", "network", "offline");
    }) as unknown as Http;
    await expect(getRates("USD", { http: failing, store: memoryFxStore(), now: () => 0 })).rejects.toThrow("offline");
  });
});

describe("convert", () => {
  it("returns the same amount for the base currency", () => {
    expect(convert({ amountMinor: 1234, currency: "usd" }, rates)).toEqual({ amountMinor: 1234, currency: "USD" });
  });

  it("divides by the base→quote rate", () => {
    // €89.13 at 0.8913 EUR per USD = $100.00
    expect(convert({ amountMinor: 8913, currency: "EUR" }, rates)).toEqual({ amountMinor: 10000, currency: "USD" });
  });

  it("handles zero-decimal sources", () => {
    // ¥14,910 at 149.1 JPY per USD = $100.00
    expect(convert({ amountMinor: 14910, currency: "JPY" }, rates)).toEqual({ amountMinor: 10000, currency: "USD" });
  });

  it("converts into a zero-decimal base", () => {
    const jpy: FxRates = { base: "JPY", date: "2026-10-08", rates: { USD: 0.0067 }, fetchedAt: 0 };
    expect(convert({ amountMinor: 1000, currency: "USD" }, jpy)).toEqual({ amountMinor: 1493, currency: "JPY" });
  });

  it("returns undefined for unknown currencies", () => {
    expect(convert({ amountMinor: 100, currency: "XYZ" }, rates)).toBeUndefined();
  });

  it("totals mixed currencies and keeps the unconvertible ones apart", () => {
    const result = convertTotal(
      [
        { amountMinor: 10000, currency: "USD" },
        { amountMinor: 8913, currency: "EUR" },
        { amountMinor: 500, currency: "XYZ" },
      ],
      rates,
    );
    expect(result.total).toEqual({ amountMinor: 20000, currency: "USD" });
    expect(result.unconverted).toEqual([{ amountMinor: 500, currency: "XYZ" }]);
  });

  it("knows when rates are needed", () => {
    expect(needsRates([{ amountMinor: 1, currency: "USD" }], "usd")).toBe(false);
    expect(needsRates([{ amountMinor: 0, currency: "EUR" }], "USD")).toBe(false);
    expect(needsRates([{ amountMinor: 1, currency: "EUR" }], "USD")).toBe(true);
  });
});
