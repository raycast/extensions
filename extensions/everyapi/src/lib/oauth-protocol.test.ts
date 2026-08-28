import { describe, expect, it, vi } from "vitest";
import {
  OAuthProtocolError,
  pollDeviceToken,
  refreshAccessToken,
  startDeviceAuthorization,
  type FetchLike,
} from "./oauth-protocol";

const CLIENT_ID = "everyapi-raycast";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OAuth device protocol", () => {
  it("starts device authorization with the Raycast client and api scope", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        device_code: "device-secret",
        user_code: "ABCD-EFGH",
        verification_uri: "https://app.everyapi.ai/device",
        verification_uri_complete:
          "https://app.everyapi.ai/device?code=ABCD-EFGH",
        expires_in: 600,
        interval: 5,
      }),
    );

    const result = await startDeviceAuthorization(
      "https://api.everyapi.ai/api",
      fetch,
    );

    expect(result.verificationUri).toContain("code=ABCD-EFGH");
    const [, init] = fetch.mock.calls[0];
    expect(init?.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(init?.body).toBe(`client_id=${CLIENT_ID}&scope=api`);
  });

  it("polls through pending and slow_down before returning tokens", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        jsonResponse({ error: "authorization_pending" }, 400),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "slow_down" }, 400))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-secret",
          refresh_token: "refresh-secret",
          expires_in: 3600,
          scope: "api",
        }),
      );
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await pollDeviceToken(
      "https://api.everyapi.ai/api",
      { deviceCode: "device-secret", interval: 2, expiresIn: 60 },
      { fetch, wait, now: () => 0 },
    );

    expect(result.accessToken).toBe("access-secret");
    expect(wait.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([
      2000, 2000, 7000,
    ]);
  });

  it.each([
    ["access_denied", "denied"],
    ["expired_token", "expired"],
  ])("maps %s to a terminal safe error", async (error, kind) => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        jsonResponse({ error, error_description: "device-secret" }, 400),
      );

    await expect(
      pollDeviceToken(
        "https://api.everyapi.ai/api",
        { deviceCode: "device-secret", interval: 0, expiresIn: 60 },
        { fetch, wait: async () => undefined, now: () => 0 },
      ),
    ).rejects.toMatchObject({ kind });
    await expect(
      pollDeviceToken(
        "https://api.everyapi.ai/api",
        { deviceCode: "device-secret", interval: 0, expiresIn: 60 },
        { fetch, wait: async () => undefined, now: () => 0 },
      ),
    ).rejects.not.toThrow("device-secret");
  });

  it("keeps the old refresh token when the server does not rotate it", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        access_token: "new-access",
        expires_in: 3600,
        scope: "api",
      }),
    );

    const result = await refreshAccessToken(
      "https://api.everyapi.ai/api",
      "old-refresh",
      fetch,
    );

    expect(result).toMatchObject({
      accessToken: "new-access",
      refreshToken: "old-refresh",
    });
  });

  it("rejects malformed success responses without leaking response bodies", async () => {
    const fetch: FetchLike = async () =>
      new Response("access_token=secret-value", { status: 200 });

    try {
      await startDeviceAuthorization("https://api.everyapi.ai/api", fetch);
      throw new Error("expected device authorization to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthProtocolError);
      expect((error as OAuthProtocolError).message).not.toContain(
        "secret-value",
      );
    }
  });
});
