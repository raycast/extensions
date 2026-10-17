import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

async function loadApi() {
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  return import("../src/api");
}

describe("Fronius API client", () => {
  beforeEach(() => fetchMock.mockReset());

  it("normalizes a trailing slash in the configured base URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ Body: { Data: {} }, Head: { Status: { Code: 0 }, Timestamp: "now" } }),
    });
    const { fetchInverterInfo } = await loadApi();

    await fetchInverterInfo("http://inverter.local/");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://inverter.local/solar_api/v1/GetInverterInfo.cgi",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects an API-level error returned with HTTP 200", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        Body: { Data: {} },
        Head: { Status: { Code: 255, Reason: "API not available" }, Timestamp: "now" },
      }),
    });
    const { fetchInverterInfo } = await loadApi();

    await expect(fetchInverterInfo("http://inverter.local")).rejects.toThrow("API not available");
  });

  it("rejects URLs without an HTTP scheme", async () => {
    const { fetchInverterInfo } = await loadApi();
    await expect(fetchInverterInfo("192.168.0.75")).rejects.toThrow("including http:// or https://");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns no browser URL for malformed saved configuration", async () => {
    const { normalizeBaseUrlOrUndefined } = await loadApi();

    expect(normalizeBaseUrlOrUndefined("not a URL")).toBeUndefined();
    expect(normalizeBaseUrlOrUndefined("http://inverter.local/")).toBe("http://inverter.local");
  });

  it("discovers the API version outside the versioned base path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ APIVersion: 1, BaseURL: "/solar_api/v1/", CompatibilityRange: "1.8-0" }),
    });
    const { fetchApiVersion } = await loadApi();

    await expect(fetchApiVersion("http://inverter.local")).resolves.toEqual({
      APIVersion: 1,
      BaseURL: "/solar_api/v1/",
      CompatibilityRange: "1.8-0",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://inverter.local/solar_api/GetAPIVersion.cgi",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("queries optional device data with system scope", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ Body: { Data: {} }, Head: { Status: { Code: 0 }, Timestamp: "now" } }),
    });
    const { fetchMeterRealtimeData } = await loadApi();

    await fetchMeterRealtimeData("http://inverter.local");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://inverter.local/solar_api/v1/GetMeterRealtimeData.cgi?Scope=System",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects an optional endpoint response without device data", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ Body: {}, Head: { Status: { Code: 0 }, Timestamp: "now" } }),
    });
    const { fetchStorageRealtimeData } = await loadApi();

    await expect(fetchStorageRealtimeData("http://inverter.local")).rejects.toThrow("battery data is missing");
  });
});
