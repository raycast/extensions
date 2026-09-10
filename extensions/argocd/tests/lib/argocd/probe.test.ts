import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROBE_TTL_MS,
  UNKNOWN_REACHABILITY,
  isProbeStale,
  probeInstance,
  type ProbeDeps,
} from "../../../src/lib/argocd/probe";
import type { ArgoInstance } from "../../../src/lib/config/instances";

const INSTANCE: ArgoInstance = {
  id: "i1",
  name: "dev",
  baseUrl: "https://argocd.example.com",
  env: "dev",
  authMode: "cli",
  allowWrite: false,
  enabled: true,
};

interface Recorded {
  url: string;
  init: RequestInit;
}

/** A clock that advances 40 ms per read, so latency is deterministic. */
function clock(step = 40) {
  let current = 1_000_000;
  return () => {
    const value = current;
    current += step;
    return value;
  };
}

function deps(response: () => Response | Promise<Response>, calls: Recorded[] = []): ProbeDeps {
  return {
    fetch: vi.fn(async (input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return response();
    }) as unknown as typeof globalThis.fetch,
    now: clock(),
    timeoutMs: 4000,
  };
}

describe("probeInstance", () => {
  it("reports the version and the round-trip time on a 200", async () => {
    const result = await probeInstance(
      INSTANCE,
      deps(() => Response.json({ Version: "v3.5.1" })),
    );
    expect(result).toMatchObject({ state: "reachable", version: "v3.5.1", reason: undefined });
    expect(result.latencyMs).toBe(40);
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  it("targets the unversioned version endpoint, which is where ArgoCD serves it", async () => {
    const calls: Recorded[] = [];
    await probeInstance(
      INSTANCE,
      deps(() => Response.json({ Version: "v3.5.1" }), calls),
    );
    // /api/v1/version is a 404 on a real server, and a 404 still counts as reachable, so
    // getting this path wrong reads as "reachable with no version" and says nothing. Hence an
    // assertion on the exact path.
    expect(calls[0]?.url).toBe("https://argocd.example.com/api/version");
    expect(calls[0]?.url).not.toContain("/v1/");
  });

  it("never sends an Authorization header, so a 401 stays unambiguous", async () => {
    const calls: Recorded[] = [];
    await probeInstance(
      INSTANCE,
      deps(() => Response.json({ Version: "v3.5.1" }), calls),
    );
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain("authorization");
  });

  it.each([401, 403, 404, 500, 503])(
    "treats a %i as reachable, because the server answered",
    async (status) => {
      const result = await probeInstance(
        INSTANCE,
        deps(() => new Response("", { status })),
      );
      expect(result.state).toBe("reachable");
      expect(result.version).toBeUndefined();
      expect(result.reason).toBe(`answered ${status}`);
    },
  );

  it("stays reachable when a 200 body is not JSON", async () => {
    const result = await probeInstance(
      INSTANCE,
      deps(() => new Response("not json", { status: 200 })),
    );
    expect(result).toMatchObject({ state: "reachable", version: undefined, reason: undefined });
  });

  it("reports unreachable with a network reason on a transport failure", async () => {
    const result = await probeInstance(
      INSTANCE,
      deps(() => {
        throw new TypeError("fetch failed");
      }),
    );
    expect(result).toMatchObject({ state: "unreachable", version: undefined, latencyMs: undefined });
    expect(result.reason).toMatch(/network/);
  });

  it("reports unreachable with a timeout reason on an abort", async () => {
    const result = await probeInstance(
      INSTANCE,
      deps(() => {
        throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
      }),
    );
    expect(result.state).toBe("unreachable");
    expect(result.reason).toBe("no answer within 4s");
  });

  it("uses its own short timeout rather than the request timeout", async () => {
    const calls: Recorded[] = [];
    await probeInstance(
      INSTANCE,
      deps(() => Response.json({}), calls),
    );
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("isProbeStale", () => {
  const reachable = { ...UNKNOWN_REACHABILITY, state: "reachable" as const, checkedAt: 1000 };

  it("is true before the first probe", () => {
    expect(isProbeStale(UNKNOWN_REACHABILITY, 0)).toBe(true);
    expect(isProbeStale(UNKNOWN_REACHABILITY, 10_000_000)).toBe(true);
  });

  it("is false inside the TTL", () => {
    expect(isProbeStale(reachable, 1000 + DEFAULT_PROBE_TTL_MS - 1)).toBe(false);
  });

  it("is true once the TTL has elapsed", () => {
    expect(isProbeStale(reachable, 1000 + DEFAULT_PROBE_TTL_MS)).toBe(true);
  });

  it("honours an explicit TTL", () => {
    expect(isProbeStale(reachable, 2500, 1000)).toBe(true);
    expect(isProbeStale(reachable, 1500, 5000)).toBe(false);
  });

  it("re-probes an unreachable instance just as often, so a VPN coming up is noticed", () => {
    const unreachable = { ...reachable, state: "unreachable" as const };
    expect(isProbeStale(unreachable, 1000 + DEFAULT_PROBE_TTL_MS)).toBe(true);
    expect(isProbeStale(unreachable, 1000 + DEFAULT_PROBE_TTL_MS - 1)).toBe(false);
  });
});
