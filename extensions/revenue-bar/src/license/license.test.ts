import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "../core/errors";
import { fixtureHttp } from "../providers/testing";
import { LicenseConfig, buyUrl, isLicensingConfigured, LICENSE_CONFIG } from "./config";
import {
  ActivateResponse,
  DeactivateResponse,
  LicenseApi,
  ValidateResponse,
  createLicenseApi,
  isDefinitiveRejection,
} from "./lemonsqueezy-license";
import {
  INVALID_RECHECK_MS,
  StoredLicense,
  deactivateLicense,
  evaluateLicense,
  fingerprint,
  isPro,
  statusLabel,
} from "./license-state";
import validateValid from "./__fixtures__/validate-valid.json";
import validateExpired from "./__fixtures__/validate-expired.json";
import validateMissing from "./__fixtures__/validate-instance-missing.json";
import activateOk from "./__fixtures__/activate-ok.json";
import activateLimit from "./__fixtures__/activate-limit.json";
import activateOther from "./__fixtures__/activate-other-product.json";
import deactivateOk from "./__fixtures__/deactivate-ok.json";

const DAY = 24 * 60 * 60 * 1000;
const KEY = "38b1460a-5104-4067-a91d-77b872934d51";
const FP = fingerprint(KEY);
const config: LicenseConfig = { storeId: 1, productId: 4, checkoutUrl: "https://store.lemonsqueezy.com/buy/x" };
const NOW = Date.parse("2026-10-08T12:00:00Z");

function api(overrides: Partial<Record<keyof LicenseApi, unknown>> = {}) {
  const make = <T>(value: unknown) =>
    vi.fn(async () => {
      if (value instanceof Error) throw value;
      return value as T;
    });
  return {
    validate: make<ValidateResponse>(overrides.validate ?? validateValid),
    activate: make<ActivateResponse>(overrides.activate ?? activateOk),
    deactivate: make<DeactivateResponse>(overrides.deactivate ?? deactivateOk),
  };
}

const network = () => new ProviderError("license", "network", "fetch failed");
const rejected = () => new ProviderError("license", "unknown", "license_key not found. (HTTP 404)", { status: 404 });

function activeStored(partial: Partial<StoredLicense> = {}): StoredLicense {
  return {
    fingerprint: FP,
    instanceId: "f90ec370-fd83-46a5-8bbd-44a241e78665",
    valid: true,
    lastValidatedAt: NOW - DAY,
    checkedAt: NOW - DAY,
    ...partial,
  };
}

function run(input: Partial<Parameters<typeof evaluateLicense>[0]> & { api: LicenseApi }) {
  return evaluateLicense({
    key: KEY,
    config,
    stored: undefined,
    now: NOW,
    instanceName: "Revenue Bar · test-mac",
    ...input,
  });
}

describe("config", () => {
  const UNCONFIGURED: LicenseConfig = { storeId: null, productId: null, checkoutUrl: "" };

  it("ships configured for the Revenue Bar Pro store and product", () => {
    expect(isLicensingConfigured(LICENSE_CONFIG)).toBe(true);
    expect(LICENSE_CONFIG.storeId).toBe(493372);
    expect(LICENSE_CONFIG.productId).toBe(1424288);
    expect(LICENSE_CONFIG.checkoutUrl).toMatch(
      /^https:\/\/revenuebarpro\.lemonsqueezy\.com\/checkout\/buy\/[0-9a-f-]{36}$/,
    );
  });

  it("is free tier while any constant is unset", () => {
    expect(isLicensingConfigured(UNCONFIGURED)).toBe(false);
    expect(isLicensingConfigured(config)).toBe(true);
    expect(isLicensingConfigured({ ...config, checkoutUrl: " " })).toBe(false);
    expect(isLicensingConfigured({ ...config, productId: null })).toBe(false);
    expect(buyUrl(config)).toBe(config.checkoutUrl);
    expect(buyUrl({ ...config, checkoutUrl: "" })).toMatch(/^https:\/\//);
  });

  it("never unlocks anything while unconfigured, even with a valid key", async () => {
    const fake = api();
    const result = await run({ api: fake, config: UNCONFIGURED });
    expect(result.status).toEqual({ kind: "unconfigured" });
    expect(isPro(result.status)).toBe(false);
    expect(fake.activate).not.toHaveBeenCalled();
  });
});

describe("activation", () => {
  it("activates a new key, stores only its fingerprint and becomes Pro", async () => {
    const fake = api();
    const result = await run({ api: fake });
    expect(fake.activate).toHaveBeenCalledWith(KEY, "Revenue Bar · test-mac");
    expect(result.status.kind).toBe("pro");
    expect(result.stored).toMatchObject({
      fingerprint: FP,
      instanceId: "f90ec370-fd83-46a5-8bbd-44a241e78665",
      valid: true,
      lastValidatedAt: NOW,
      customerEmail: "john@example.com",
      activationUsage: 2,
      activationLimit: 3,
    });
    expect(JSON.stringify(result.stored)).not.toContain(KEY);
  });

  it("reports the activation limit as invalid", async () => {
    const result = await run({ api: api({ activate: activateLimit }) });
    expect(result.status).toMatchObject({
      kind: "invalid",
      message: "This license key has reached the activation limit.",
    });
    expect(result.stored).toMatchObject({ valid: false, checkedAt: NOW });
  });

  it("rejects keys for another product and gives the activation back", async () => {
    const fake = api({ activate: activateOther });
    const result = await run({ api: fake });
    expect(result.status).toMatchObject({ kind: "invalid", message: "This license key is for a different product." });
    expect(fake.deactivate).toHaveBeenCalledWith(KEY, "f90ec370-fd83-46a5-8bbd-44a241e78665");
  });

  it("treats a 4xx as a definitive rejection", async () => {
    const result = await run({ api: api({ activate: rejected() }) });
    expect(result.status.kind).toBe("invalid");
  });

  it("stays free but does not store anything when activation cannot reach the server", async () => {
    const result = await run({ api: api({ activate: network() }) });
    expect(result.status).toMatchObject({ kind: "offline", message: "fetch failed" });
    expect(result.stored).toBeUndefined();
  });

  it("does not re-check a rejected key for an hour unless forced", async () => {
    const stored: StoredLicense = { fingerprint: FP, valid: false, error: "expired", checkedAt: NOW - 1000 };
    const fake = api();
    expect((await run({ api: fake, stored })).status).toMatchObject({ kind: "invalid", message: "expired" });
    expect(fake.activate).not.toHaveBeenCalled();
    await run({ api: fake, stored: { ...stored, checkedAt: NOW - INVALID_RECHECK_MS - 1 } });
    expect(fake.activate).toHaveBeenCalledTimes(1);
    await run({ api: fake, stored, force: true });
    expect(fake.activate).toHaveBeenCalledTimes(2);
  });

  it("starts over when the key changes", async () => {
    const fake = api();
    await run({ api: fake, stored: activeStored({ fingerprint: "other" }) });
    expect(fake.activate).toHaveBeenCalled();
    expect(fake.validate).not.toHaveBeenCalled();
  });
});

describe("validation and caching", () => {
  it("uses the cached result for 7 days without calling the API", async () => {
    const fake = api();
    const result = await run({ api: fake, stored: activeStored({ lastValidatedAt: NOW - 7 * DAY + 1000 }) });
    expect(result.status).toMatchObject({ kind: "pro", source: "cache" });
    expect(result.stored).toBeUndefined();
    expect(fake.validate).not.toHaveBeenCalled();
  });

  it("revalidates after 7 days, or when forced", async () => {
    const fake = api();
    const stale = await run({ api: fake, stored: activeStored({ lastValidatedAt: NOW - 7 * DAY - 1 }) });
    expect(fake.validate).toHaveBeenCalledWith(KEY, "f90ec370-fd83-46a5-8bbd-44a241e78665");
    expect(stale.status).toMatchObject({ kind: "pro", source: "server" });
    expect(stale.stored).toMatchObject({ lastValidatedAt: NOW });
    await run({ api: fake, stored: activeStored(), force: true });
    expect(fake.validate).toHaveBeenCalledTimes(2);
  });

  it("ends Pro immediately on a definitive invalid answer", async () => {
    const result = await run({
      api: api({ validate: validateExpired }),
      stored: activeStored({ lastValidatedAt: NOW - 8 * DAY }),
    });
    expect(result.status).toMatchObject({ kind: "invalid", message: "This license key is expired." });
    expect(result.stored).toMatchObject({ valid: false, licenseStatus: "expired" });
  });

  it("ends Pro on a 4xx from validate", async () => {
    const result = await run({
      api: api({ validate: rejected() }),
      stored: activeStored({ lastValidatedAt: NOW - 8 * DAY }),
    });
    expect(result.status.kind).toBe("invalid");
  });

  it("re-activates when the instance was removed but the key is still active", async () => {
    const fake = api({ validate: validateMissing });
    const result = await run({ api: fake, stored: activeStored({ lastValidatedAt: NOW - 8 * DAY }) });
    expect(fake.activate).toHaveBeenCalled();
    expect(result.status).toMatchObject({ kind: "pro", source: "server" });
  });

  it("rejects a validated key that belongs to another product", async () => {
    const result = await run({
      api: api({ validate: { ...validateValid, meta: { ...validateValid.meta, product_id: 100 } } }),
      stored: activeStored({ lastValidatedAt: NOW - 8 * DAY }),
    });
    expect(result.status.kind).toBe("invalid");
  });
});

describe("offline grace", () => {
  it("keeps Pro for 14 days after the last successful validation", async () => {
    const result = await run({
      api: api({ validate: network() }),
      stored: activeStored({ lastValidatedAt: NOW - 13 * DAY }),
    });
    expect(result.status).toMatchObject({ kind: "pro", source: "grace" });
    expect(statusLabel(result.status)).toBe("Pro (offline)");
    expect(result.stored).toBeUndefined();
  });

  it("falls back to free after the grace period", async () => {
    const result = await run({
      api: api({ validate: network() }),
      stored: activeStored({ lastValidatedAt: NOW - 14 * DAY - 1 }),
    });
    expect(result.status.kind).toBe("offline");
    expect(isPro(result.status)).toBe(false);
  });

  it("treats rate limits and server errors as transient", () => {
    expect(isDefinitiveRejection(new ProviderError("license", "rate_limit", "x", { status: 429 }))).toBe(false);
    expect(isDefinitiveRejection(new ProviderError("license", "network", "x", { status: 503 }))).toBe(false);
    expect(isDefinitiveRejection(network())).toBe(false);
    expect(isDefinitiveRejection(rejected())).toBe(true);
  });
});

describe("no key and deactivation", () => {
  it("is free without a key and clears stale storage", async () => {
    expect(await run({ api: api(), key: "  " })).toEqual({ status: { kind: "none" }, stored: undefined });
    expect((await run({ api: api(), key: undefined, stored: activeStored() })).stored).toBeNull();
  });

  it("deactivates this machine and does not silently re-activate", async () => {
    const fake = api();
    const stored = await deactivateLicense({ key: KEY, stored: activeStored(), api: fake });
    expect(fake.deactivate).toHaveBeenCalledWith(KEY, "f90ec370-fd83-46a5-8bbd-44a241e78665");
    expect(stored).toMatchObject({ fingerprint: FP, deactivated: true, valid: false });
    expect(stored.instanceId).toBeUndefined();

    const after = await run({ api: fake, stored });
    expect(after.status.kind).toBe("deactivated");
    expect(fake.activate).not.toHaveBeenCalled();

    const reactivated = await run({ api: fake, stored, activate: true });
    expect(reactivated.status.kind).toBe("pro");
  });

  it("surfaces a refused deactivation", async () => {
    await expect(
      deactivateLicense({
        key: KEY,
        stored: activeStored(),
        api: api({ deactivate: { deactivated: false, error: "nope" } }),
      }),
    ).rejects.toThrow("nope");
  });
});

describe("License API client", () => {
  it("posts form-encoded requests to the documented endpoints", async () => {
    const http = fixtureHttp([
      { match: "/licenses/validate", body: validateValid },
      { match: "/licenses/activate", body: activateOk },
      { match: "/licenses/deactivate", body: deactivateOk },
    ]);
    const client = createLicenseApi(http);
    await client.validate(KEY, "inst-1");
    await client.activate(KEY, "Revenue Bar · mac");
    await client.deactivate(KEY, "inst-1");
    expect(http.calls.map((c) => c.url)).toEqual([
      "https://api.lemonsqueezy.com/v1/licenses/validate",
      "https://api.lemonsqueezy.com/v1/licenses/activate",
      "https://api.lemonsqueezy.com/v1/licenses/deactivate",
    ]);
    expect(http.calls[0]?.body).toBe(`license_key=${KEY}&instance_id=inst-1`);
    expect(new URLSearchParams(http.calls[1]?.body).get("instance_name")).toBe("Revenue Bar · mac");
    expect(http.calls[0]?.headers?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("uses the no-retry client for activation", async () => {
    const retrying = fixtureHttp([{ match: "/", body: activateOk }]);
    const single = fixtureHttp([{ match: "/", body: activateOk }]);
    await createLicenseApi(retrying, single).activate(KEY, "x");
    expect(retrying.calls).toHaveLength(0);
    expect(single.calls).toHaveLength(1);
  });
});
