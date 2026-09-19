import { describe, expect, it } from "vitest";

import { AuthenticationError } from "../../domain/errors";
import { ApiTokenAuthProvider } from "./ApiTokenAuthProvider";

const token = "synthetic-token-42";
const tokenDigest = "6f4c56f6f9adbfd0766bdec2927ca0ade6a908dbe6dae9591fb0eb47cb1a8f16";

function createProvider(target: "mcp" | "openapi", apiToken: () => string | undefined) {
  return new ApiTokenAuthProvider(target, () => ({ apiToken: apiToken() }));
}

describe("ApiTokenAuthProvider", () => {
  it("rejects a missing API token with an actionable authentication error", async () => {
    const provider = createProvider("mcp", () => undefined);

    await expect(provider.getAccessToken()).rejects.toMatchObject({
      name: "AuthenticationError",
      message: "Enter a TickTick API Token in extension preferences.",
    } satisfies Partial<AuthenticationError>);
  });

  it("rejects a whitespace-only API token", async () => {
    const provider = createProvider("mcp", () => "  \n\t ");

    await expect(provider.getAccessToken()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("reads and trims the API token on demand", async () => {
    let value = `  ${token}  `;
    const provider = createProvider("mcp", () => value);

    await expect(provider.getAccessToken()).resolves.toBe(token);
    value = "replacement-token";
    await expect(provider.getAccessToken()).resolves.toBe("replacement-token");
  });

  it("uses a stable SHA-256 cache key without embedding the raw token", async () => {
    const provider = createProvider("mcp", () => token);

    await expect(provider.accountCacheKey()).resolves.toBe(`token:mcp:${tokenDigest}`);
    expect(await provider.accountCacheKey()).not.toContain(token);
  });

  it("uses distinct cache namespaces for MCP and Open API", async () => {
    const mcp = createProvider("mcp", () => token);
    const openapi = createProvider("openapi", () => token);

    expect(await mcp.accountCacheKey()).toBe(`token:mcp:${tokenDigest}`);
    expect(await openapi.accountCacheKey()).toBe(`token:openapi:${tokenDigest}`);
  });

  it("invalidates only the rejected target when providers share the same token reader", async () => {
    const readPreferences = () => ({ apiToken: `  ${token}  ` });
    const mcp = new ApiTokenAuthProvider("mcp", readPreferences);
    const openapi = new ApiTokenAuthProvider("openapi", readPreferences);

    await mcp.invalidate();

    await expect(mcp.getAccessToken()).rejects.toMatchObject({
      name: "AuthenticationError",
      message: "The current TickTick API Token was rejected. Update it in extension preferences.",
    } satisfies Partial<AuthenticationError>);
    await expect(openapi.getAccessToken()).resolves.toBe(token);
    await expect(openapi.accountCacheKey()).resolves.toBe(`token:openapi:${tokenDigest}`);
  });

  it("rejects the same target and digest after invalidation", async () => {
    const provider = createProvider("mcp", () => token);

    await provider.getAccessToken();
    await provider.invalidate();
    await expect(provider.getAccessToken()).rejects.toMatchObject({
      name: "AuthenticationError",
      message: "The current TickTick API Token was rejected. Update it in extension preferences.",
    } satisfies Partial<AuthenticationError>);
  });

  it("allows a replacement token after invalidation", async () => {
    let value = token;
    const provider = createProvider("openapi", () => value);

    await provider.invalidate();
    value = "replacement-token";

    await expect(provider.getAccessToken()).resolves.toBe("replacement-token");
  });

  it("keeps neither the raw token nor a digest outside its rejected-pair memory", async () => {
    const provider = createProvider("mcp", () => token);

    await provider.getAccessToken();
    expect(JSON.stringify(provider)).not.toContain(token);
    expect(JSON.stringify(provider)).not.toContain(tokenDigest);

    await provider.invalidate();
    expect(JSON.stringify(provider)).not.toContain(token);
    expect(JSON.stringify(provider)).toContain(tokenDigest);
  });
});
