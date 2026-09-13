import { describe, expect, it } from "vitest";

import { RaycastOAuthClient } from "./RaycastOAuthClient";
import type { RaycastOAuthDependencies } from "./RaycastOAuthClient";

describe("RaycastOAuthClient", () => {
  it("uses a target-specific Raycast PKCE client and maps tokens", async () => {
    const calls: unknown[] = [];
    const request = { codeVerifier: "verifier", redirectURI: "redirect", toURL: () => "https://auth" };
    const client = new RaycastOAuthClient("mcp", {
      create: (options: Parameters<RaycastOAuthDependencies["create"]>[0]) => {
        calls.push(options);
        return {
          authorizationRequest: async () => request,
          authorize: async () => ({ authorizationCode: "code" }),
          getTokens: async () => ({
            accessToken: "token",
            refreshToken: "refresh",
            expiresIn: 10,
            scope: "tasks:read",
            updatedAt: new Date(0),
            isExpired: () => false,
          }),
          setTokens: async (value: unknown) => {
            calls.push(value);
          },
          removeTokens: async () => {
            calls.push("removed");
          },
        };
      },
      redirectMethodWeb: "web" as never,
    });

    expect(
      await client.authorizationRequest({
        endpoint: "https://auth",
        clientId: "client",
        scope: "tasks:read",
        extraParameters: { resource: "https://mcp.ticktick.com/" },
      })
    ).toBe(request);
    expect(await client.getTokens()).toMatchObject({ accessToken: "token", isExpired: false });
    await client.setTokens({ access_token: "new", token_type: "Bearer", expires_in: 20 }, "refresh");
    expect(calls).toEqual([
      { redirectMethod: "web", providerName: "TickTick", providerIcon: "tick-logo.png", providerId: "ticktick-mcp" },
      { accessToken: "new", refreshToken: "refresh", expiresIn: 20, scope: undefined },
    ]);
  });

  it("keeps Open API token storage separate from MCP", () => {
    const options: unknown[] = [];
    new RaycastOAuthClient("openapi", {
      create: (value) => {
        options.push(value);
        return {
          authorizationRequest: async () => ({ codeVerifier: "v", redirectURI: "r", toURL: () => "u" }),
          authorize: async () => ({ authorizationCode: "c" }),
          getTokens: async () => undefined,
          setTokens: async () => undefined,
          removeTokens: async () => undefined,
        };
      },
      redirectMethodWeb: "web" as never,
    });
    expect(options).toEqual([
      {
        redirectMethod: "web",
        providerName: "TickTick",
        providerIcon: "tick-logo.png",
        providerId: "ticktick-openapi",
      },
    ]);
  });
});
