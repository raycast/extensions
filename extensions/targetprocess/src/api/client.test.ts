import { afterEach, describe, expect, it, vi } from "vitest";

import { classifyStatus, fetchJson, retryPlan, transportOrder } from "./client";
import { TargetprocessError } from "./types";

const instance = { baseUrl: "https://acme.tpondemand.com", token: "s3cret" };
const known = { ...instance, authTransport: "query" as const };

/** No backoff in tests: the policy is what is under test, not the clock. */
const fast = { retryDelayMs: 0 };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Responses are consumed in order; once the list runs out the last one repeats.
 *
 * Repeating matters: "the instance keeps returning 401" is a different scenario
 * from "the mock ran out", and an exception here would be indistinguishable from
 * a network failure.
 */
function mockFetch(...responses: (Response | Error)[]) {
  let index = 0;
  const fetchMock = vi.fn(async () => {
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (next instanceof Error) throw next;
    if (!next) throw new Error("no responses configured");
    // A Response body can only be read once, so hand out a fresh clone.
    return next.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function networkError(): Error {
  return Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transportOrder", () => {
  it("tries the transports that keep the token out of the URL first", () => {
    expect(transportOrder()).toEqual(["bearer", "basic", "query"]);
  });

  it("starts with the known-good transport and keeps the others as fallbacks", () => {
    expect(transportOrder("query")).toEqual(["query", "bearer", "basic"]);
  });

  it("does not repeat the known transport", () => {
    expect(transportOrder("bearer")).toEqual(["bearer", "basic", "query"]);
  });
});

describe("retryPlan", () => {
  it("trusts a known transport for two rounds before re-negotiating", () => {
    expect(retryPlan("query")).toEqual([["query"], ["query"], ["query", "bearer", "basic"]]);
  });

  it("negotiates from scratch every round when no transport is known", () => {
    const plan = retryPlan();
    expect(plan).toHaveLength(3);
    expect(plan.every((round) => round.length === 3)).toBe(true);
  });
});

describe("classifyStatus", () => {
  it("treats 404 as a missing record, not a broken instance", () => {
    expect(classifyStatus(404).kind).toBe("not-found");
  });

  it("treats 5xx as the server's problem", () => {
    expect(classifyStatus(503).kind).toBe("server");
  });

  it("treats 400 as our bad query", () => {
    expect(classifyStatus(400).kind).toBe("unexpected");
  });
});

describe("fetchJson", () => {
  it("returns the parsed body and the transport that worked", async () => {
    mockFetch(json({ ok: true }));
    const result = await fetchJson<{ ok: boolean }>(instance, "api/v1/Context", {}, fast);
    expect(result.data.ok).toBe(true);
    expect(result.transport).toBe("bearer");
  });

  it("falls through 401s to the transport that authenticates", async () => {
    const fetchMock = mockFetch(json({}, 401), json({}, 401), json({ ok: true }));
    const result = await fetchJson(instance, "api/v1/Context", {}, fast);
    expect(result.transport).toBe("query");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("starts from a known transport, so the usual case is one request", async () => {
    const fetchMock = mockFetch(json({ ok: true }));
    const result = await fetchJson(known, "api/v1/Context", {}, fast);
    expect(result.transport).toBe("query");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an unreachable instance rather than an auth problem", async () => {
    mockFetch(networkError());
    await expect(fetchJson(instance, "api/v1/Context", {}, fast)).rejects.toMatchObject({ kind: "unreachable" });
  });

  it("does not retry a status that is an answer", async () => {
    const fetchMock = mockFetch(json({}, 404));
    await expect(fetchJson(instance, "api/v1/Assignables/1", {}, fast)).rejects.toMatchObject({ kind: "not-found" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recognises a login page as not being the API", async () => {
    mockFetch(new Response("<html>Sign in</html>", { status: 200 }));
    const error = await fetchJson(instance, "api/v1/Context", {}, fast).catch((caught) => caught);
    expect(error).toBeInstanceOf(TargetprocessError);
    expect(error.kind).toBe("not-targetprocess");
  });

  it("lets an abort through untouched rather than reporting it as a failure", async () => {
    mockFetch(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
    await expect(fetchJson(instance, "api/v1/Context", {}, fast)).rejects.toThrow(/aborted/);
  });

  it("never puts the token in an error message", async () => {
    mockFetch(networkError());
    const error = await fetchJson(instance, "api/v1/Context", {}, fast).catch((caught) => caught);
    expect(error.message).not.toContain("s3cret");
  });
});

describe("retrying before reporting a rejected token", () => {
  it("recovers silently when a known transport blips once", async () => {
    const fetchMock = mockFetch(json({}, 401), json({ ok: true }));
    const result = await fetchJson(known, "api/v1/Context", {}, fast);
    expect(result.transport).toBe("query");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers when it blips twice, without re-negotiating", async () => {
    const fetchMock = mockFetch(json({}, 401), json({}, 401), json({ ok: true }));
    const result = await fetchJson(known, "api/v1/Context", {}, fast);
    // Still the known transport: round three starts with it before the others.
    expect(result.transport).toBe("query");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("re-negotiates only once the known transport has failed three times", async () => {
    const fetchMock = mockFetch(json({}, 401), json({}, 401), json({}, 401), json({ ok: true }));
    const result = await fetchJson(known, "api/v1/Context", {}, fast);
    expect(result.transport).toBe("bearer");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reports a genuinely rejected token once every round has failed", async () => {
    mockFetch(json({}, 401));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).rejects.toMatchObject({ kind: "unauthorised" });
  });

  it("retries a network failure before calling the instance unreachable", async () => {
    const fetchMock = mockFetch(networkError(), json({ ok: true }));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries throttling before reporting it", async () => {
    const fetchMock = mockFetch(json({}, 429), json({ ok: true }));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports sustained throttling as throttling, not as a bad token", async () => {
    mockFetch(json({}, 429));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).rejects.toMatchObject({ kind: "rate-limited" });
  });

  it("does not retry a definitive answer even once", async () => {
    const fetchMock = mockFetch(json({}, 500));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).rejects.toMatchObject({ kind: "server" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bounds the number of requests for a hopeless case", async () => {
    const fetchMock = mockFetch(json({}, 401));
    await expect(fetchJson(known, "api/v1/Context", {}, fast)).rejects.toThrow();
    // One, one, then all three transports.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
