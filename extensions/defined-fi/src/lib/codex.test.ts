import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Network } from "./types";
import { classifyResponse, looksLikeCodexKey, mapFilterTokensResult } from "./codex";
import { definedUrlFor, deriveDefinedSlug, explorerUrlFor } from "./networks";

// -----------------------------------------------------------------------
// looksLikeCodexKey
// -----------------------------------------------------------------------

describe("looksLikeCodexKey", () => {
  const KEY = "0123456789abcdef0123456789abcdef01234567";

  it("accepts 40 lowercase hex characters, trimming whitespace", () => {
    expect(looksLikeCodexKey(KEY)).toBe(true);
    expect(looksLikeCodexKey(`  ${KEY}\n`)).toBe(true);
  });

  it("rejects other secrets and hashes that might sit on the clipboard", () => {
    expect(looksLikeCodexKey(`ghp_${"a".repeat(36)}`)).toBe(false); // GitHub token
    expect(looksLikeCodexKey(`0x${"a".repeat(64)}`)).toBe(false); // tx hash
    expect(looksLikeCodexKey("a".repeat(64))).toBe(false); // bare 32-byte hex
    expect(looksLikeCodexKey(KEY.toUpperCase())).toBe(false);
    expect(looksLikeCodexKey(KEY.slice(1))).toBe(false);
    expect(looksLikeCodexKey(`${KEY}0`)).toBe(false);
    expect(looksLikeCodexKey("")).toBe(false);
  });
});

// -----------------------------------------------------------------------
// classifyResponse (error classification)
// -----------------------------------------------------------------------

describe("classifyResponse", () => {
  it("classifies NOT_AUTHORIZED as invalid-key", () => {
    const result = classifyResponse(200, {
      errors: [{ message: "Your API key was not found", extensions: { code: "NOT_AUTHORIZED" } }],
    });
    expect(result).toEqual({ kind: "invalid-key", message: "Your API key was not found" });
  });

  it("classifies a bare HTTP 401 as invalid-key", () => {
    const result = classifyResponse(401, undefined);
    expect(result?.kind).toBe("invalid-key");
  });

  it("classifies HTTP 429 as rate-limit", () => {
    const result = classifyResponse(429, { errors: [{ message: "Too many requests" }] });
    expect(result?.kind).toBe("rate-limit");
  });

  it("classifies TOO_MANY_REQUESTS code as rate-limit even without 429 status", () => {
    const result = classifyResponse(200, {
      errors: [{ message: "slow down", extensions: { code: "TOO_MANY_REQUESTS" } }],
    });
    expect(result?.kind).toBe("rate-limit");
  });

  it("classifies a monthly-quota message as quota", () => {
    const result = classifyResponse(429, {
      errors: [{ message: "You have exceeded your monthly quota" }],
    });
    expect(result?.kind).toBe("quota");
  });

  it("classifies other GraphQL errors as unknown", () => {
    const result = classifyResponse(200, { errors: [{ message: "boom" }] });
    expect(result?.kind).toBe("unknown");
  });

  it("classifies a non-2xx status with no body as unknown", () => {
    const result = classifyResponse(500, undefined);
    expect(result?.kind).toBe("unknown");
  });

  it("returns undefined for a clean success response", () => {
    const result = classifyResponse(200, { data: { ok: true } });
    expect(result).toBeUndefined();
  });
});

// -----------------------------------------------------------------------
// mapFilterTokensResult
// -----------------------------------------------------------------------

const ETH_NETWORK: Network = {
  id: 1,
  name: "Ethereum",
  slug: "eth",
  explorerTokenUrl: "https://etherscan.io/token/{address}",
};

function networkMap(...networks: Network[]): Map<number, Network> {
  return new Map(networks.map((n) => [n.id, n]));
}

describe("mapFilterTokensResult", () => {
  it("maps a full row, parsing stringified numbers", () => {
    const mapped = mapFilterTokensResult(
      {
        priceUSD: "1.23",
        change24: "0.045",
        liquidity: "1000000",
        volume24: "500000",
        marketCap: "9000000",
        token: {
          address: "0xabc",
          name: "Test Token",
          symbol: "TEST",
          networkId: 1,
          info: { imageThumbUrl: "https://img/thumb.png", imageSmallUrl: "https://img/small.png" },
        },
      },
      networkMap(ETH_NETWORK),
    );

    expect(mapped).toEqual({
      id: "0xabc:1",
      address: "0xabc",
      networkId: 1,
      networkName: "Ethereum",
      networkSlug: "eth",
      name: "Test Token",
      symbol: "TEST",
      imageUrl: "https://img/thumb.png",
      priceUsd: 1.23,
      change24: 0.045,
      liquidityUsd: 1000000,
      volume24Usd: 500000,
      marketCapUsd: 9000000,
      definedUrl: "https://www.defined.fi/token/eth/0xabc",
      explorerUrl: "https://etherscan.io/token/0xabc",
    });
  });

  it("leaves optional fields undefined when missing from the response", () => {
    const mapped = mapFilterTokensResult(
      {
        token: { address: "0xdef", networkId: 1 },
      },
      networkMap(ETH_NETWORK),
    );

    expect(mapped?.priceUsd).toBeUndefined();
    expect(mapped?.change24).toBeUndefined();
    expect(mapped?.liquidityUsd).toBeUndefined();
    expect(mapped?.volume24Usd).toBeUndefined();
    expect(mapped?.marketCapUsd).toBeUndefined();
    expect(mapped?.imageUrl).toBeUndefined();
    expect(mapped?.name).toBe("");
    expect(mapped?.symbol).toBe("");
  });

  it("falls back gracefully for a network missing from the cache", () => {
    const mapped = mapFilterTokensResult({ token: { address: "0x1", networkId: 999999 } }, networkMap(ETH_NETWORK));

    expect(mapped?.networkName).toBe("Network 999999");
    expect(mapped?.explorerUrl).toBeUndefined();
    expect(mapped?.definedUrl).toBe(`https://www.defined.fi/token/${mapped?.networkSlug}/0x1`);
  });

  it("returns undefined for a row with no token address", () => {
    const mapped = mapFilterTokensResult({ token: { address: "", networkId: 1 } }, networkMap(ETH_NETWORK));
    expect(mapped).toBeUndefined();
  });

  it("treats non-numeric string fields as undefined rather than NaN", () => {
    const mapped = mapFilterTokensResult(
      { priceUSD: "not-a-number", token: { address: "0x1", networkId: 1 } },
      networkMap(ETH_NETWORK),
    );
    expect(mapped?.priceUsd).toBeUndefined();
  });
});

// -----------------------------------------------------------------------
// networks.ts: slug + explorer URL building
// -----------------------------------------------------------------------

describe("deriveDefinedSlug", () => {
  it("uses the override table for verified mismatches", () => {
    expect(deriveDefinedSlug(10, "optimism", "Optimism")).toBe("opti");
    expect(deriveDefinedSlug(1, "ethereum", "Ethereum")).toBe("eth");
  });

  it("falls back to the lowercased short name when no override exists", () => {
    expect(deriveDefinedSlug(137, "Polygon", "Polygon")).toBe("polygon");
  });

  it("falls back to a slugified network name when short name is missing", () => {
    expect(deriveDefinedSlug(424242, undefined, "My Test Chain")).toBe("my-test-chain");
  });

  it("falls back to the network id as a last resort", () => {
    expect(deriveDefinedSlug(555, "", "")).toBe("555");
  });
});

describe("definedUrlFor", () => {
  it("builds the canonical /token/ URL", () => {
    expect(definedUrlFor("eth", "0xabc")).toBe("https://www.defined.fi/token/eth/0xabc");
  });
});

describe("explorerUrlFor", () => {
  it("builds a known explorer URL", () => {
    expect(explorerUrlFor(1, "0xabc")).toBe("https://etherscan.io/token/0xabc");
    expect(explorerUrlFor(8453, "0xdef")).toBe("https://basescan.org/token/0xdef");
  });

  it("returns undefined for an unknown network", () => {
    expect(explorerUrlFor(123456789, "0xabc")).toBeUndefined();
  });
});

// -----------------------------------------------------------------------
// searchTokens / getNetworks / validateKey (fetch mocked, no network)
// -----------------------------------------------------------------------

describe("searchTokens, getNetworks, validateKey", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function jsonResponse(status: number, body: unknown): Response {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as unknown as Response;
  }

  it("returns [] without calling fetch for an empty or whitespace phrase", async () => {
    const { searchTokens } = await import("./codex");
    expect(await searchTokens("key", "")).toEqual([]);
    expect(await searchTokens("key", "   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dedupes results by id", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (body.query.includes("GetNetworks")) {
        return jsonResponse(200, { data: { getNetworks: [{ id: 1, name: "Ethereum", networkShortName: "eth" }] } });
      }
      return jsonResponse(200, {
        data: {
          filterTokens: {
            results: [
              { token: { address: "0xabc", networkId: 1, name: "A", symbol: "A" } },
              { token: { address: "0xabc", networkId: 1, name: "A", symbol: "A" } },
            ],
          },
        },
      });
    });

    const { searchTokens } = await import("./codex");
    const results = await searchTokens("key", "abc");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("0xabc:1");
  });

  it("passes the phrase through unmodified, including a leading $", async () => {
    let capturedVariables: Record<string, unknown> | undefined;
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (body.query.includes("GetNetworks")) {
        return jsonResponse(200, { data: { getNetworks: [] } });
      }
      capturedVariables = body.variables;
      return jsonResponse(200, { data: { filterTokens: { results: [] } } });
    });

    const { searchTokens } = await import("./codex");
    await searchTokens("key", "$PEPE");
    expect(capturedVariables?.phrase).toBe("$PEPE");
  });

  it("only includes a network filter when networkId is set", async () => {
    const capturedVariables: Record<string, unknown>[] = [];
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (body.query.includes("GetNetworks")) {
        return jsonResponse(200, { data: { getNetworks: [] } });
      }
      capturedVariables.push(body.variables);
      return jsonResponse(200, { data: { filterTokens: { results: [] } } });
    });

    const { searchTokens } = await import("./codex");
    await searchTokens("key", "pepe");
    expect(capturedVariables[0].filters).toBeUndefined();

    await searchTokens("key", "pepe", { networkId: 8453 });
    expect(capturedVariables[1].filters).toEqual({ network: [8453] });
  });

  it("caches getNetworks in memory across calls", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { getNetworks: [{ id: 1, name: "Ethereum", networkShortName: "eth" }] } }),
    );

    const { getNetworks } = await import("./codex");
    const first = await getNetworks("key");
    const second = await getNetworks("key");
    expect(first).toBe(second); // same array instance: served from cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sorts networks by name", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: {
          getNetworks: [
            { id: 2, name: "Zeta", networkShortName: "zeta" },
            { id: 1, name: "Alpha", networkShortName: "alpha" },
          ],
        },
      }),
    );
    const { getNetworks } = await import("./codex");
    const networks = await getNetworks("key");
    expect(networks.map((n) => n.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("validateKey resolves on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { getNetworks: [] } }));
    const { validateKey } = await import("./codex");
    await expect(validateKey("key")).resolves.toBeUndefined();
  });

  it("validateKey rejects with CodexError('invalid-key') for a bad key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        errors: [{ message: "Your API key was not found", extensions: { code: "NOT_AUTHORIZED" } }],
      }),
    );
    const { validateKey } = await import("./codex");
    const { CodexError } = await import("./types");
    const err = await validateKey("bad-key").catch((e) => e);
    expect(err).toBeInstanceOf(CodexError);
    expect((err as InstanceType<typeof CodexError>).kind).toBe("invalid-key");
  });

  it("retries a rate-limited request with backoff and eventually succeeds", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      fetchMock.mockImplementation(async () => {
        calls += 1;
        if (calls < 3) {
          return jsonResponse(429, { errors: [{ message: "slow down", extensions: { code: "TOO_MANY_REQUESTS" } }] });
        }
        return jsonResponse(200, { data: { getNetworks: [] } });
      });

      const { getNetworks } = await import("./codex");
      const promise = getNetworks("key");
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual([]);
      expect(calls).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws CodexError('rate-limit') after exhausting retries", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(
        jsonResponse(429, { errors: [{ message: "slow down", extensions: { code: "TOO_MANY_REQUESTS" } }] }),
      );
      const { getNetworks } = await import("./codex");
      const { CodexError } = await import("./types");
      const promise = getNetworks("key").catch((e) => e);
      await vi.runAllTimersAsync();
      const err = await promise;
      expect(err).toBeInstanceOf(CodexError);
      expect((err as InstanceType<typeof CodexError>).kind).toBe("rate-limit");
      expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
    } finally {
      vi.useRealTimers();
    }
  });

  it("classifies a fetch failure as CodexError('network')", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { getNetworks } = await import("./codex");
    const { CodexError } = await import("./types");
    const err = await getNetworks("key").catch((e) => e);
    expect(err).toBeInstanceOf(CodexError);
    expect((err as InstanceType<typeof CodexError>).kind).toBe("network");
  });

  it("propagates an abort as AbortError, not CodexError", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    fetchMock.mockRejectedValue(abortError);
    const { getNetworks } = await import("./codex");
    const { CodexError } = await import("./types");
    const controller = new AbortController();
    const err = await getNetworks("key", controller.signal).catch((e) => e);
    expect(err).toBe(abortError);
    expect(err).not.toBeInstanceOf(CodexError);
  });

  it("validateKey checks each key against the API even after another key cached networks", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "good-key"
        ? jsonResponse(200, { data: { getNetworks: [] } })
        : jsonResponse(401, {
            errors: [{ message: "Your API key was not found", extensions: { code: "NOT_AUTHORIZED" } }],
          });
    });
    const { getNetworks, validateKey } = await import("./codex");
    await getNetworks("good-key");
    const err = await validateKey("bad-key").catch((e) => e);
    expect(err).toMatchObject({ kind: "invalid-key" });
  });

  it("an aborted caller does not fail a concurrent caller sharing the network lookup", async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (release = r)));
    const { getNetworks } = await import("./codex");
    const controller = new AbortController();
    const aborted = getNetworks("key", controller.signal).catch((e) => e);
    const other = getNetworks("key");
    controller.abort();
    release(jsonResponse(200, { data: { getNetworks: [{ id: 1, name: "Ethereum", networkShortName: "eth" }] } }));
    expect((await aborted).name).toBe("AbortError");
    expect(await other).toHaveLength(1);
  });
});
