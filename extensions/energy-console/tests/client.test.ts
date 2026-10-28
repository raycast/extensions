import { describe, expect, it, vi } from "vitest";
import { EcoFlowApiError, EcoFlowClient } from "../src/api/client";
import { generateSignature } from "../src/utils/signing";

describe("EcoFlowClient", () => {
  it("uses the current global host and signs GET query parameters", async () => {
    const calls: Array<[Parameters<typeof fetch>[0], Parameters<typeof fetch>[1]]> = [];
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return new Response(
        JSON.stringify({
          code: "0",
          message: "Success",
          data: { "bmsMaster.soc": "88" },
        }),
        { status: 200 },
      );
    };
    const client = new EcoFlowClient(
      { accessKey: "public-test-access", secretKey: "public-test-secret" },
      {
        dependencies: {
          fetch: fetchMock,
          now: () => 1_671_171_709_428,
          nonce: () => "345164",
        },
      },
    );

    await expect(client.getAllQuotas("DCABTEST1234")).resolves.toEqual({ "bmsMaster.soc": "88" });

    const [input, init] = calls[0]!;
    expect(String(input)).toBe("https://api.ecoflow.com/iot-open/sign/device/quota/all?sn=DCABTEST1234");
    const headers = new Headers(init?.headers);
    expect(headers.get("accessKey")).toBe("public-test-access");
    expect(headers.get("nonce")).toBe("345164");
    expect(headers.get("timestamp")).toBe("1671171709428");
    expect(headers.get("sign")).toBe(
      generateSignature({ sn: "DCABTEST1234" }, "public-test-access", "public-test-secret", "345164", "1671171709428"),
    );
  });

  it("rejects malformed success payloads", async () => {
    const client = new EcoFlowClient(
      { accessKey: "public-test-access", secretKey: "public-test-secret" },
      {
        dependencies: {
          fetch: vi.fn(
            async () => new Response(JSON.stringify({ code: "0", message: "Success", data: null })),
          ) as typeof fetch,
        },
      },
    );

    await expect(client.listDevices()).rejects.toThrow("invalid device list");
  });

  it("returns a credential error without exposing either key", async () => {
    const accessKey = "do-not-leak-access";
    const secretKey = "do-not-leak-secret";
    const client = new EcoFlowClient(
      { accessKey, secretKey },
      {
        dependencies: {
          fetch: vi.fn(
            async () => new Response(JSON.stringify({ code: "8521", message: "denied" }), { status: 401 }),
          ) as typeof fetch,
        },
      },
    );

    const error = await client.listDevices().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(EcoFlowApiError);
    expect(String(error)).not.toContain(accessKey);
    expect(String(error)).not.toContain(secretKey);
    expect(String(error)).toContain("Check both keys");
  });

  it("keeps the credential error useful when the server returns HTML", async () => {
    const client = new EcoFlowClient(
      { accessKey: "public-test-access", secretKey: "public-test-secret" },
      {
        dependencies: {
          fetch: vi.fn(async () => new Response("<html>Unauthorized</html>", { status: 401 })) as typeof fetch,
        },
      },
    );

    await expect(client.listDevices()).rejects.toThrow("Check both keys");
  });

  it("redacts credentials echoed by an upstream error", async () => {
    const accessKey = "do-not-leak-access";
    const secretKey = "do-not-leak-secret";
    const client = new EcoFlowClient(
      { accessKey, secretKey },
      {
        dependencies: {
          fetch: vi.fn(
            async () =>
              new Response(JSON.stringify({ code: "9999", message: `request ${accessKey} failed with ${secretKey}` }), {
                status: 400,
              }),
          ) as typeof fetch,
        },
      },
    );

    const error = await client.listDevices().catch((reason: unknown) => reason);
    expect(String(error)).toContain("[redacted]");
    expect(String(error)).not.toContain(accessKey);
    expect(String(error)).not.toContain(secretKey);
  });
});
