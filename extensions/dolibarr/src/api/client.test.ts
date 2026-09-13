import { describe, expect, it, vi } from "vitest";
import { createClient, DolibarrError, type FetchLike } from "./client";

const config = { baseUrl: "https://example.org/api/index.php", apiKey: "secret-key" };

function fakeFetch(responses: Array<{ ok: boolean; status: number; body: unknown }>) {
  const queue = [...responses];
  return vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("Unexpected additional request");
    return { ok: next.ok, status: next.status, json: async () => next.body };
  }) as unknown as FetchLike & { mock: { calls: unknown[][] } };
}

describe("createClient.list", () => {
  it("returns the records", async () => {
    const client = createClient(config, fakeFetch([{ ok: true, status: 200, body: [{ id: "1" }] }]));
    await expect(client.list("/thirdparties")).resolves.toEqual([{ id: "1" }]);
  });

  it("translates HTTP 404 into an empty list", async () => {
    const client = createClient(config, fakeFetch([{ ok: false, status: 404, body: {} }]));
    await expect(client.list("/thirdparties")).resolves.toEqual([]);
  });

  it("reports HTTP 401 in plain language", async () => {
    const client = createClient(config, fakeFetch([{ ok: false, status: 401, body: {} }]));
    await expect(client.list("/thirdparties")).rejects.toThrow(/API key/);
  });

  it("never puts the API key in an error message", async () => {
    const client = createClient(config, fakeFetch([{ ok: false, status: 500, body: {} }]));
    await expect(client.list("/thirdparties")).rejects.not.toThrow(/secret-key/);
  });

  it("names the target address and the underlying cause on a network error", async () => {
    const failing = vi.fn(async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    }) as unknown as FetchLike;
    const client = createClient(config, failing);
    await expect(client.list("/thirdparties")).rejects.toThrow(/example\.org.*ENOTFOUND|ENOTFOUND.*example\.org/s);
  });

  it("does not leak the API key on a network error either", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as FetchLike;
    const client = createClient(config, failing);
    await expect(client.list("/thirdparties")).rejects.not.toThrow(/secret-key/);
  });

  it("sends the API key as the DOLAPIKEY header", async () => {
    const spy = fakeFetch([{ ok: true, status: 200, body: [] }]);
    await createClient(config, spy).list("/thirdparties");
    expect(spy).toHaveBeenCalledWith(expect.any(String), {
      headers: { DOLAPIKEY: "secret-key", Accept: "application/json" },
    });
  });

  it("appends parameters URL-encoded", async () => {
    const spy = fakeFetch([{ ok: true, status: 200, body: [] }]);
    await createClient(config, spy).list("/thirdparties", { limit: 10, properties: "id,name" });
    expect(spy.mock.calls[0][0]).toBe("https://example.org/api/index.php/thirdparties?limit=10&properties=id%2Cname");
  });
});

describe("createClient.one", () => {
  it("throws on HTTP 404 instead of returning an empty list", async () => {
    const client = createClient(config, fakeFetch([{ ok: false, status: 404, body: {} }]));
    await expect(client.one("/proposals/9")).rejects.toBeInstanceOf(DolibarrError);
  });
});

describe("createClient.all", () => {
  it("keeps paging until a page comes back short", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
    const client = createClient(
      config,
      fakeFetch([
        { ok: true, status: 200, body: full },
        { ok: true, status: 200, body: [{ id: "1000" }] },
      ]),
    );
    await expect(client.all("/thirdparties")).resolves.toHaveLength(1001);
  });

  it("stops after a short first page", async () => {
    const client = createClient(config, fakeFetch([{ ok: true, status: 200, body: [{ id: "1" }] }]));
    await expect(client.all("/thirdparties")).resolves.toHaveLength(1);
  });

  it("counts the page parameter from zero", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
    const spy = fakeFetch([
      { ok: true, status: 200, body: full },
      { ok: true, status: 200, body: [] },
    ]);
    await createClient(config, spy).all("/thirdparties");
    expect(spy.mock.calls[0][0]).toContain("page=0");
    expect(spy.mock.calls[1][0]).toContain("page=1");
  });
});
