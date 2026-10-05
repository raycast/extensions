import { exchangeAuthorizationCode, refreshAccessToken, type TokenResponse } from "./token-exchange";

function successfulResponse(body: Partial<TokenResponse> = {}): Response {
  return new Response(
    JSON.stringify({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      scope: "openid profile email",
      ...body,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

describe("Clerk OAuth token exchange", () => {
  it("exchanges an authorization code as a public PKCE client", async () => {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => successfulResponse());

    const token = await exchangeAuthorizationCode(
      {
        endpoint: "https://clerk.hotkys.com/oauth/token",
        clientId: "client-id",
        authorizationCode: "authorization-code",
        codeVerifier: "code-verifier",
        redirectUri: "https://raycast.com/redirect?packageName=shortcuts-search",
      },
      fetcher
    );

    expect(token.access_token).toBe("access-token");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://clerk.hotkys.com/oauth/token");
    expect(request?.method).toBe("POST");
    expect(request?.headers).toEqual({
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(new URLSearchParams(request?.body as string)).toEqual(
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "client-id",
        code: "authorization-code",
        code_verifier: "code-verifier",
        redirect_uri: "https://raycast.com/redirect?packageName=shortcuts-search",
      })
    );
  });

  it("refreshes without a client secret and preserves a rotated refresh token", async () => {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () =>
      successfulResponse({ refresh_token: "rotated-refresh-token" })
    );

    const token = await refreshAccessToken(
      {
        endpoint: "https://clerk.hotkys.com/oauth/token",
        clientId: "client-id",
        refreshToken: "current-refresh-token",
      },
      fetcher
    );

    expect(token.refresh_token).toBe("rotated-refresh-token");
    const [, request] = fetcher.mock.calls[0];
    expect(new URLSearchParams(request?.body as string)).toEqual(
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: "client-id",
        refresh_token: "current-refresh-token",
      })
    );
  });

  it("keeps the current refresh token when Clerk omits it", async () => {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async () =>
      successfulResponse({ refresh_token: undefined })
    );

    const token = await refreshAccessToken(
      {
        endpoint: "https://clerk.hotkys.com/oauth/token",
        clientId: "client-id",
        refreshToken: "current-refresh-token",
      },
      fetcher
    );

    expect(token.refresh_token).toBe("current-refresh-token");
  });

  it("reports the OAuth error without exposing token request values", async () => {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Authorization code expired",
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
    );

    await expect(
      refreshAccessToken(
        {
          endpoint: "https://clerk.hotkys.com/oauth/token",
          clientId: "client-id",
          refreshToken: "must-not-appear",
        },
        fetcher
      )
    ).rejects.toThrow("Authorization code expired");
  });

  it("rejects malformed successful responses", async () => {
    const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        new Response(JSON.stringify({ expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );

    await expect(
      refreshAccessToken(
        {
          endpoint: "https://clerk.hotkys.com/oauth/token",
          clientId: "client-id",
          refreshToken: "refresh-token",
        },
        fetcher
      )
    ).rejects.toThrow("missing an access token");
  });
});
