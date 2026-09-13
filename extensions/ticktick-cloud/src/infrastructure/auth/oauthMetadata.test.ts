import { describe, expect, it } from "vitest";

import { ProtocolError } from "../../domain/errors";
import {
  AUTHORIZATION_METADATA,
  AUTHORIZATION_SERVER,
  MCP_RESOURCE,
  RESOURCE_METADATA,
  authorizationMetadata,
  resourceMetadata,
} from "../../test/fixtures/oauthMetadata";
import { discoverOAuthMetadata } from "./oauthMetadata";

function response(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init, headers: { "content-type": "application/json" } });
}

function fetchSequence(responses: Response[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    const next = responses.shift();
    if (!next) throw new Error(`Unexpected fetch: ${String(input)}`);
    return next;
  }) as typeof fetch;
}

function redirectedResponse(body: unknown): Response {
  const result = response(body);
  Object.defineProperty(result, "redirected", { value: true });
  return result;
}

describe("discoverOAuthMetadata", () => {
  it("discovers the verified metadata through the exact two-fetch sequence", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push([String(input), init]);
      return calls.length === 1 ? response(resourceMetadata) : response(authorizationMetadata);
    }) as typeof fetch;

    await expect(discoverOAuthMetadata(fetchImpl)).resolves.toEqual({
      resource: MCP_RESOURCE,
      authorizationServer: AUTHORIZATION_SERVER,
      authorizationEndpoint: authorizationMetadata.authorization_endpoint,
      tokenEndpoint: authorizationMetadata.token_endpoint,
      registrationEndpoint: authorizationMetadata.registration_endpoint,
    });
    expect(calls).toEqual([
      [RESOURCE_METADATA, { redirect: "error" }],
      [AUTHORIZATION_METADATA, { redirect: "error" }],
    ]);
  });

  it.each([
    ["missing write scope", { ...resourceMetadata, scopes_supported: ["tasks:read"] }, authorizationMetadata],
    [
      "multiple authorization servers",
      { ...resourceMetadata, authorization_servers: [AUTHORIZATION_SERVER, "https://other.example/"] },
      authorizationMetadata,
    ],
    [
      "HTTP authorization server",
      { ...resourceMetadata, authorization_servers: ["http://ticktick.com/"] },
      authorizationMetadata,
    ],
    ["missing S256", resourceMetadata, { ...authorizationMetadata, code_challenge_methods_supported: [] }],
    ["missing none", resourceMetadata, { ...authorizationMetadata, token_endpoint_auth_methods_supported: [] }],
    ["missing code", resourceMetadata, { ...authorizationMetadata, response_types_supported: [] }],
    ["missing authorization_code", resourceMetadata, { ...authorizationMetadata, grant_types_supported: [] }],
    ["missing issuer", resourceMetadata, { ...authorizationMetadata, issuer: undefined }],
    ["wrong issuer", resourceMetadata, { ...authorizationMetadata, issuer: "https://other.example" }],
    [
      "wrong authorization endpoint",
      resourceMetadata,
      { ...authorizationMetadata, authorization_endpoint: "https://api.ticktick.com/oauth/authorize" },
    ],
    [
      "wrong token endpoint",
      resourceMetadata,
      { ...authorizationMetadata, token_endpoint: "https://ticktick.com/oauth/token" },
    ],
    [
      "wrong registration endpoint",
      resourceMetadata,
      { ...authorizationMetadata, registration_endpoint: "https://ticktick.com/oauth/register" },
    ],
    [
      "HTTP endpoint",
      resourceMetadata,
      { ...authorizationMetadata, token_endpoint: "http://ticktick.com/oauth/token" },
    ],
  ])("rejects %s", async (_name, resource, authorization) => {
    await expect(
      discoverOAuthMetadata(fetchSequence([response(resource), response(authorization)]))
    ).rejects.toBeInstanceOf(ProtocolError);
  });

  it("rejects an observable redirect even when the final URL remains HTTPS", async () => {
    await expect(discoverOAuthMetadata(fetchSequence([redirectedResponse(resourceMetadata)]))).rejects.toBeInstanceOf(
      ProtocolError
    );
  });

  it("rejects invalid JSON and every non-2xx response without exposing a body or query secret", async () => {
    await expect(
      discoverOAuthMetadata(fetchSequence([new Response("not-json", { status: 200 })]))
    ).rejects.toBeInstanceOf(ProtocolError);
    await expect(
      discoverOAuthMetadata(fetchSequence([response(resourceMetadata), new Response("not-json", { status: 200 })]))
    ).rejects.toBeInstanceOf(ProtocolError);
    await expect(
      discoverOAuthMetadata(
        fetchSequence([response(resourceMetadata), new Response("client_secret=leak", { status: 502 })])
      )
    ).rejects.toBeInstanceOf(ProtocolError);
    let error: Error | undefined;
    try {
      await discoverOAuthMetadata(fetchSequence([new Response("client_secret=leak", { status: 500 })]));
    } catch (cause) {
      error = cause as Error;
    }
    expect(error).toBeInstanceOf(ProtocolError);
    expect(error?.message).not.toContain("client_secret");
    expect(error?.message).not.toContain("leak");
  });
});
