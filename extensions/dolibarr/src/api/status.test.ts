import { describe, expect, it, vi } from "vitest";
import { checkConnection, type ProbeFetch } from "./status";

const config = { baseUrl: "https://example.org/api/index.php", apiKey: "secret-key" };

function respondWith(response: { ok: boolean; status: number; contentType: string | null; body: string }): ProbeFetch {
  return vi.fn(async () => ({
    ok: response.ok,
    status: response.status,
    contentType: response.contentType,
    text: async () => response.body,
  })) as unknown as ProbeFetch;
}

function failWith(error: unknown): ProbeFetch {
  return vi.fn(async () => {
    throw error;
  }) as unknown as ProbeFetch;
}

describe("checkConnection", () => {
  it("reports success along with the Dolibarr version", async () => {
    const probe = respondWith({
      ok: true,
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: { code: 200, dolibarr_version: "23.0.3" } }),
    });
    const result = await checkConnection(config, probe);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.version).toBe("23.0.3");
  });

  it("detects an unreachable address", async () => {
    const result = await checkConnection(
      config,
      failWith(Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("network");
      expect(result.detail).toContain("ENOTFOUND");
    }
  });

  it("detects a URL pointing at the web interface instead of the API", async () => {
    const probe = respondWith({ ok: true, status: 200, contentType: "text/html; charset=UTF-8", body: "<html>" });
    const result = await checkConnection(config, probe);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-dolibarr");
  });

  it("detects a rejected API key", async () => {
    const probe = respondWith({
      ok: false,
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: 401 } }),
    });
    const result = await checkConnection(config, probe);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unauthorized");
  });

  it("treats 403 like 401", async () => {
    const probe = respondWith({ ok: false, status: 403, contentType: "application/json", body: "{}" });
    const result = await checkConnection(config, probe);
    if (!result.ok) expect(result.reason).toBe("unauthorized");
  });

  it("reports any other HTTP failure as such", async () => {
    const probe = respondWith({ ok: false, status: 500, contentType: "application/json", body: "{}" });
    const result = await checkConnection(config, probe);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("http");
  });

  it("does not accept JSON without a version as Dolibarr", async () => {
    const probe = respondWith({ ok: true, status: 200, contentType: "application/json", body: '{"irgendwas":1}' });
    const result = await checkConnection(config, probe);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-dolibarr");
  });

  it("queries the status endpoint with the API key", async () => {
    const probe = respondWith({
      ok: true,
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: { dolibarr_version: "23.0.3" } }),
    });
    await checkConnection(config, probe);
    expect(probe).toHaveBeenCalledWith("https://example.org/api/index.php/status", {
      headers: { DOLAPIKEY: "secret-key", Accept: "application/json" },
    });
  });

  it("never leaks the API key in a message", async () => {
    const result = await checkConnection(config, failWith(new TypeError("fetch failed")));
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });
});
