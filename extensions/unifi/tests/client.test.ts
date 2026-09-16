import { describe, expect, it, vi } from "vitest";
import {
  allowsSelfSignedCertificateForUrl,
  buildServiceBaseUrl,
  normalizeControllerUrl,
  UniFiClient,
  UniFiError,
} from "../src/api/client";

function jsonResponse(payload: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

const baseConfig = {
  apiKey: "test-secret-key",
  connectionMode: "local" as const,
  controllerUrl: "https://192.168.1.1",
};

describe("controller URL policy", () => {
  it("normalizes a local console to its origin", () => {
    expect(normalizeControllerUrl(" https://192.168.1.1/ ")).toBe("https://192.168.1.1");
  });

  it("rejects all insecure destinations and embedded credentials", () => {
    expect(() => normalizeControllerUrl("http://unifi.local:8080")).toThrow("HTTPS");
    expect(() => normalizeControllerUrl("http://example.com")).toThrow("HTTPS");
    expect(() => normalizeControllerUrl("https://user:password@unifi.local")).toThrow("must not contain credentials");
  });

  it("builds local and cloud connector service URLs", () => {
    expect(buildServiceBaseUrl("protect", baseConfig)).toBe("https://192.168.1.1/proxy/protect/integration");
    expect(
      buildServiceBaseUrl("network", {
        connectionMode: "cloud",
        consoleId: "console/id",
      }),
    ).toBe("https://api.ui.com/v1/connector/consoles/console%2Fid/proxy/network/integration");
    expect(buildServiceBaseUrl("site-manager", { connectionMode: "local" })).toBe("https://api.ui.com");
  });

  it("allows self-signed certificates only for the configured local console origin", () => {
    expect(
      allowsSelfSignedCertificateForUrl("https://192.168.1.1", {
        connectionMode: "local",
        controllerUrl: "https://192.168.1.1",
      }),
    ).toBe(false);
    expect(
      allowsSelfSignedCertificateForUrl("https://192.168.1.1/proxy/network/integration/v1/sites", {
        allowSelfSignedCertificate: true,
        connectionMode: "local",
        controllerUrl: "https://192.168.1.1",
      }),
    ).toBe(true);
    expect(
      allowsSelfSignedCertificateForUrl("https://api.ui.com/v1/hosts", {
        allowSelfSignedCertificate: true,
        connectionMode: "local",
        controllerUrl: "https://192.168.1.1",
      }),
    ).toBe(false);
    expect(
      allowsSelfSignedCertificateForUrl("https://192.168.1.1", {
        allowSelfSignedCertificate: true,
        connectionMode: "cloud",
        controllerUrl: "https://192.168.1.1",
      }),
    ).toBe(false);
  });
});

describe("UniFiClient", () => {
  it("paginates Network collections and sends the API key only as a header", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ count: 2, data: [{ id: "1" }, { id: "2" }], limit: 200, offset: 0, totalCount: 3 }),
      )
      .mockResolvedValueOnce(jsonResponse({ count: 1, data: [{ id: "3" }], limit: 200, offset: 2, totalCount: 3 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    const result = await client.listResource("network-devices", { siteId: "site 1" });

    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe(
      "https://192.168.1.1/proxy/network/integration/v1/sites/site%201/devices?limit=200&offset=0",
    );
    expect(request.mock.calls[1][0]).toContain("offset=2");
    expect(request.mock.calls[0][1]?.headers).toMatchObject({ "X-API-Key": "test-secret-key" });
    expect(request.mock.calls[0][0]).not.toContain("test-secret-key");
  });

  it("uses the cloud connector for Protect", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse([{ id: "camera-1", name: "Front Door" }]));
    const client = new UniFiClient({
      apiKey: "key",
      connectionMode: "cloud",
      consoleId: "console-1",
      fetch: request,
    });

    const result = await client.listResource("protect-cameras");

    expect(result).toEqual([{ id: "camera-1", name: "Front Door" }]);
    expect(request.mock.calls[0][0]).toBe(
      "https://api.ui.com/v1/connector/consoles/console-1/proxy/protect/integration/v1/cameras",
    );
  });

  it("retries transient reads and respects Retry-After", async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "slow down" }, 429, { "retry-after": "0" }))
      .mockResolvedValueOnce(jsonResponse([{ id: "camera-1" }]));
    const client = new UniFiClient({ ...baseConfig, fetch: request, wait });

    await expect(client.listResource("protect-cameras")).resolves.toEqual([{ id: "camera-1" }]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(0);
  });

  it("uses exponential fallback delay when Retry-After is absent", async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse([{ id: "camera-1" }]));
    const client = new UniFiClient({ ...baseConfig, fetch: request, wait });

    await client.listResource("protect-cameras");

    expect(wait).toHaveBeenCalledWith(250);
  });

  it("explains certificate verification failures for local consoles", async () => {
    const certificateError = Object.assign(new Error("self signed certificate"), {
      code: "DEPTH_ZERO_SELF_SIGNED_CERT",
    });
    const request = vi.fn().mockRejectedValue(new TypeError("fetch failed", { cause: certificateError }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.listSites()).rejects.toThrow(
      "Could not verify the UniFi console certificate. Enable Allow Self-Signed Console Certificate in the extension preferences, configure a trusted certificate, or use Cloud Connector mode.",
    );
  });

  it.each([
    ["innerspace-access-points", "access_points"],
    ["innerspace-floor-plans", "floor_plans"],
    ["innerspace-switches", "switches"],
    ["innerspace-inventory", "devices"],
  ] as const)("extracts the named %s collection", async (resource, envelope) => {
    const request = vi.fn().mockResolvedValue(jsonResponse({ [envelope]: [{ id: "item-1" }, { id: "item-2" }] }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.listResource(resource)).resolves.toEqual([{ id: "item-1" }, { id: "item-2" }]);
  });

  it("follows Site Manager nextToken pagination", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "host-1" }], nextToken: "page-2" }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "host-2" }] }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.listResource("site-manager-hosts")).resolves.toEqual([
      { id: "host-1" },
      { id: "host-2" },
    ]);
    expect(request.mock.calls[0][0]).toContain("pageSize=200");
    expect(request.mock.calls[1][0]).toContain("nextToken=page-2");
  });

  it("follows Mobility offset pagination", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "device-1" }], total: 2, offset: 0, limit: 1 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "device-2" }], total: 2, offset: 1, limit: 1 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.listResource("mobility-devices", { workspaceId: "workspace-1" })).resolves.toEqual([
      { id: "device-1" },
      { id: "device-2" },
    ]);
    expect(request.mock.calls[0][0]).toContain("limit=200&offset=0");
    expect(request.mock.calls[1][0]).toContain("limit=1&offset=1");
  });

  it("follows Carrier cursor pagination", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: "subscriber-1" }], meta: { hasMore: true, nextCursor: "page-2" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "subscriber-2" }], meta: { hasMore: false } }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.listResource("carrier-subscribers")).resolves.toEqual([
      { id: "subscriber-1" },
      { id: "subscriber-2" },
    ]);
    expect(request.mock.calls[0][0]).toContain("limit=500");
    expect(request.mock.calls[1][0]).toContain("cursor=page-2");
  });

  it("reports remote errors with trace IDs without leaking credentials", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse({ message: "not allowed", traceId: "trace-1" }, 403));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    const error = await client.listResource("protect-cameras").catch((caught) => caught);

    expect(error).toBeInstanceOf(UniFiError);
    expect(error).toMatchObject({ message: "not allowed (Trace ID: trace-1)", status: 403, traceId: "trace-1" });
    expect(String(error)).not.toContain("test-secret-key");
  });

  it("does not retry physical actions", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse({ message: "temporary failure" }, 503));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.restartNetworkDevice("site-1", "device-1")).rejects.toThrow("temporary failure");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({ action: "RESTART" }),
      method: "POST",
    });
  });

  it("validates Protect action ranges before operating hardware", async () => {
    const request = vi.fn().mockResolvedValue(new Response(undefined, { status: 204 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.controlProtect({ action: "play-siren", deviceId: "siren-1", duration: 6 })).rejects.toThrow(
      "5, 10, 20, or 30",
    );
    await expect(client.controlProtect({ action: "activate-relay", deviceId: "relay-1", outputId: 2 })).rejects.toThrow(
      "0 through 1",
    );
    await expect(client.controlProtect({ action: "ptz-patrol-start", deviceId: "camera-1", slot: 5 })).rejects.toThrow(
      "0 through 4",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("sends documented Protect alarm-hub action fields", async () => {
    const request = vi.fn().mockResolvedValue(new Response(undefined, { status: 204 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await client.controlProtect({
      action: "trigger-alarm-hub",
      delay: 250,
      deviceId: "hub-1",
      duration: 5000,
      enable: true,
      outputId: 1,
    });

    expect(request.mock.calls[0][0]).toContain("/v1/alarm-hubs/hub-1/outputs/1/trigger");
    expect(request.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({ delay: 250, duration: 5000, enable: true }),
      method: "POST",
    });
  });

  it("returns authenticated camera snapshots as buffers", async () => {
    const request = vi.fn().mockResolvedValue(new Response(Buffer.from([1, 2, 3]), { status: 200 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.getCameraSnapshot("camera-1")).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(request.mock.calls[0][0]).toContain("/v1/cameras/camera-1/snapshot?highQuality=true");
  });

  it("falls back to a standard snapshot when a camera does not support full HD", async () => {
    const snapshot = Buffer.from([1, 2, 3]);
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Camera does not support full HD snapshot" }, 400))
      .mockResolvedValueOnce(new Response(snapshot, { status: 200 }));
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    await expect(client.getCameraSnapshot("camera-1")).resolves.toEqual(snapshot);
    expect(request.mock.calls[0][0]).toContain("highQuality=true");
    expect(request.mock.calls[1][0]).toContain("highQuality=false");
  });

  it("keeps successful Network collections when one API group is unavailable", async () => {
    const request = vi.fn(async (url: string) => {
      if (url.includes("/clients?")) return jsonResponse({ message: "not allowed" }, 403);
      const id = url.match(/\/(devices|networks|broadcasts|policies|wans)\?/)?.[1] ?? "item";
      return jsonResponse({ count: 1, data: [{ id }], limit: 200, offset: 0, totalCount: 1 });
    });
    const client = new UniFiClient({ ...baseConfig, fetch: request });

    const overview = await client.getNetworkOverview({ id: "site-1", internalReference: "default", name: "Home" });

    expect(overview.devices).toEqual([{ id: "devices" }]);
    expect(overview.networks).toEqual([{ id: "networks" }]);
    expect(overview.clients).toEqual([]);
    expect(overview.unavailable).toEqual([
      { resource: "network-clients", reason: "not allowed" },
    ]);
  });
});
