import type { OAuth } from "@raycast/api";
import fetch from "node-fetch";

type Client = Pick<OAuth.PKCEClient, "getTokens" | "setTokens" | "removeTokens" | "authorizationRequest" | "authorize">;
type TokenResponse = OAuth.TokenResponse & { expires_at?: number };

class AuthorizationRejectedError extends Error {}

// Each personal app has its own Raycast token store. Secrets are sent only to
// Strava's token endpoint, never in the browser URL or via the shared proxy.
export function createCustomStravaProvider<T extends Client>(client: T, clientId: string, clientSecret: string) {
  async function exchange(parameters: Record<string, string>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    let payload: unknown;
    try {
      response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        signal: controller.signal,
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...parameters }),
      });
      if (response.ok) {
        try {
          payload = await response.json();
        } catch {
          throw new Error("Strava returned an invalid authorization response. Please try again.");
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Strava sign-in timed out. Please try again.");
      }
      if (
        error instanceof Error &&
        error.message === "Strava returned an invalid authorization response. Please try again."
      )
        throw error;
      throw new Error("Could not reach Strava. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      // Do not surface raw OAuth responses: they can contain credentials.
      if (response.status === 400 || response.status === 401) {
        throw new AuthorizationRejectedError(
          "Strava could not authorize your app. Check your Client ID and Client Secret in extension preferences. If needed, sign out of Strava there and reconnect.",
        );
      }
      if (response.status === 429) {
        throw new Error("Strava's rate limit was reached. Please try again later.");
      }
      throw new Error(`Strava authorization is unavailable (HTTP ${response.status}). Please try again later.`);
    }
    const tokens = payload as TokenResponse;
    if (
      !tokens ||
      typeof tokens.access_token !== "string" ||
      !tokens.access_token ||
      typeof tokens.refresh_token !== "string" ||
      !tokens.refresh_token
    ) {
      throw new Error("Strava returned an incomplete authorization response. Please reconnect.");
    }
    const expiresIn =
      typeof tokens.expires_at === "number" ? tokens.expires_at - Math.floor(Date.now() / 1000) : tokens.expires_in;
    if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error("Strava returned an invalid token expiration. Please reconnect.");
    }
    await client.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn,
      scope: tokens.scope,
    });
    return tokens.access_token;
  }

  return {
    client,
    async authorize() {
      if (!clientId || !clientSecret) {
        throw new Error(
          "Enter both Strava Client ID and Client Secret in Workouts settings. A personal API app is required; creating one requires a paid Strava subscription.",
        );
      }
      if (!/^\d+$/.test(clientId)) {
        throw new Error("Your Strava Client ID must contain only numbers. Copy it from strava.com/settings/api.");
      }
      const tokens = await client.getTokens();
      if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;
      if (tokens?.refreshToken) {
        try {
          return await exchange({ grant_type: "refresh_token", refresh_token: tokens.refreshToken });
        } catch (error) {
          // Only discard rejected credentials. Temporary failures should leave
          // the saved connection available for the next refresh attempt.
          if (!(error instanceof AuthorizationRejectedError)) throw error;
          await client.removeTokens();
        }
      }
      const request = await client.authorizationRequest({
        endpoint: "https://www.strava.com/oauth/authorize",
        clientId,
        scope: "read,read_all,activity:read_all,activity:write",
        extraParameters: { approval_prompt: "force" },
      });
      const { authorizationCode } = await client.authorize(request);
      return exchange({ grant_type: "authorization_code", code: authorizationCode });
    },
  };
}
