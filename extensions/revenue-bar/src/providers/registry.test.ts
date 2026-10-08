import { describe, expect, it } from "vitest";
import { redact } from "../core/errors";
import { fixtureHttp } from "./testing";
import { configuredProviderIds, createProviders, keyFor, partitionProviders } from "./registry";

const http = fixtureHttp([]);

describe("registry", () => {
  it("lists configured providers in fixed order and ignores blank keys", () => {
    expect(
      configuredProviderIds({ paddleApiKey: "pdl_live_apikey_x", gumroadAccessToken: "  ", stripeApiKey: "rk_live_x" }),
    ).toEqual(["stripe", "paddle"]);
    expect(configuredProviderIds({})).toEqual([]);
    expect(keyFor("lemonsqueezy", { lemonSqueezyApiKey: "  key  " })).toBe("key");
  });

  it("gives the free tier the first configured provider only", () => {
    expect(partitionProviders(["lemonsqueezy", "gumroad", "paddle"], false)).toEqual({
      active: ["lemonsqueezy"],
      locked: ["gumroad", "paddle"],
    });
    expect(partitionProviders(["lemonsqueezy", "gumroad"], true)).toEqual({
      active: ["lemonsqueezy", "gumroad"],
      locked: [],
    });
    expect(partitionProviders([], false)).toEqual({ active: [], locked: [] });
  });

  it("builds providers and registers their keys for redaction", () => {
    const providers = createProviders(
      ["stripe", "gumroad", "paddle", "lemonsqueezy"],
      {
        stripeApiKey: "rk_live_abc",
        gumroadAccessToken: "gumroad-secret-token-777",
        paddleApiKey: "pdl_sdbx_apikey_123",
        lemonSqueezyApiKey: "ls-secret-key-999",
        paddleEnvironment: "live",
      },
      http,
    );
    expect(providers.map((p) => p.id)).toEqual(["stripe", "gumroad", "paddle", "lemonsqueezy"]);
    expect(providers.find((p) => p.id === "paddle")?.dashboardUrl).toContain("sandbox-vendors");
    expect(redact("token gumroad-secret-token-777 and ls-secret-key-999")).toBe("token [redacted] and [redacted]");
  });

  it("skips providers without a key", () => {
    expect(createProviders(["stripe"], {}, http)).toEqual([]);
  });
});
