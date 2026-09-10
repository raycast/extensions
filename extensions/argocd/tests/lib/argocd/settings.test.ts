import { describe, expect, it, vi } from "vitest";
import { fetchOidcSettings, projectOidcSettings } from "../../../src/lib/argocd/settings";
import { ApiError, NetworkError, TimeoutError } from "../../../src/lib/argocd/errors";

const SETTINGS = {
  url: "https://argocd.example.com",
  oidcConfig: {
    name: "Corp SSO",
    issuer: "https://idp.example.com",
    clientID: "web-client",
    scopes: ["openid", "profile", "email", "groups", "offline_access"],
    enablePKCEAuthentication: true,
  },
};

describe("projectOidcSettings", () => {
  it("uses the web client when no CLI client is configured, and says so", () => {
    expect(projectOidcSettings(SETTINGS)).toEqual({
      issuer: "https://idp.example.com",
      clientId: "web-client",
      usesCliClient: false,
      scopes: ["openid", "profile", "email", "groups", "offline_access"],
      pkceEnabled: true,
      providerName: "Corp SSO",
    });
  });

  it("prefers cliClientID, which is the public client a PKCE login needs", () => {
    const withCli = { oidcConfig: { ...SETTINGS.oidcConfig, cliClientID: "public-client" } };
    expect(projectOidcSettings(withCli)).toMatchObject({
      clientId: "public-client",
      usesCliClient: true,
    });
  });

  it("returns undefined when the instance has no OIDC configuration", () => {
    expect(projectOidcSettings({ url: "https://argocd.example.com" })).toBeUndefined();
    expect(projectOidcSettings({ oidcConfig: null })).toBeUndefined();
    expect(projectOidcSettings(null)).toBeUndefined();
  });

  it("returns undefined without an issuer or a client", () => {
    expect(projectOidcSettings({ oidcConfig: { clientID: "c" } })).toBeUndefined();
    expect(projectOidcSettings({ oidcConfig: { issuer: "https://idp.example.com" } })).toBeUndefined();
  });

  it("tolerates missing scopes and a missing PKCE flag", () => {
    expect(projectOidcSettings({ oidcConfig: { issuer: "https://idp.example.com", clientID: "c" } })).toMatchObject({
      scopes: [],
      pkceEnabled: false,
      providerName: undefined,
    });
  });
});

describe("fetchOidcSettings", () => {
  function stub(response: () => Response) {
    return vi.fn(async () => response()) as unknown as typeof globalThis.fetch;
  }

  it("reads the unauthenticated settings endpoint", async () => {
    const calls: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL) => {
      calls.push(String(input));
      return Response.json(SETTINGS);
    }) as unknown as typeof globalThis.fetch;

    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: fetchStub })).resolves.toMatchObject({
      clientId: "web-client",
    });
    expect(calls[0]).toBe("https://argocd.example.com/api/v1/settings");
  });

  it("sends no Authorization header, since this is what makes a first login possible", async () => {
    let headers: Record<string, string> = {};
    const fetchStub = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      headers = (init?.headers ?? {}) as Record<string, string>;
      return Response.json(SETTINGS);
    }) as unknown as typeof globalThis.fetch;

    await fetchOidcSettings("https://argocd.example.com", { fetch: fetchStub });
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain("authorization");
  });

  it("reports an instance with no OIDC configuration as a reason to use a token", async () => {
    const fetchStub = stub(() => Response.json({ url: "https://argocd.example.com" }));
    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: fetchStub })).rejects.toThrowError(
      /API token instead/,
    );
  });

  it("maps a transport failure, a timeout and a non-2xx to typed errors", async () => {
    const network = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: network })).rejects.toThrowError(
      NetworkError,
    );

    const abort = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("aborted"), { name: "TimeoutError" })) as unknown as typeof fetch;
    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: abort })).rejects.toThrowError(TimeoutError);

    const failing = stub(() => new Response("", { status: 502 }));
    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: failing })).rejects.toThrowError(ApiError);
  });

  it("reports a body that is not JSON", async () => {
    const fetchStub = stub(() => new Response("<html>", { status: 200 }));
    await expect(fetchOidcSettings("https://argocd.example.com", { fetch: fetchStub })).rejects.toThrowError(
      /did not return JSON/,
    );
  });
});
