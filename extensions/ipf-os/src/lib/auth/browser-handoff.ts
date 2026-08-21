import { OAuth } from "@raycast/api";

import { getWebAppUrl } from "../config";
import type { AuthProvider, AuthSession } from "./provider";
import { postForTokens } from "./token-client";
import {
  clearSession,
  expireAccessToken,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  readSession,
  writeSession,
} from "./token-store";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "iPF OS",
  providerIcon: "extension-icon.png",
  description: "Connect your iPF OS account",
});

const FALLBACK_ADMIN_EMAIL = "admin@ipfsoftwares.com";

export class BrowserHandoffAuthProvider implements AuthProvider {
  private inFlight?: Promise<AuthSession>;

  async getAccessToken(interactive = true): Promise<string> {
    const session = interactive ? await this.getSession() : await this.getCachedSession();
    if (!session) throw new Error("Authentication required");
    return session.accessToken;
  }

  async invalidateAccessToken(): Promise<void> {
    this.inFlight = undefined;
    await expireAccessToken();
  }

  async signOut(): Promise<void> {
    this.inFlight = undefined;
    await Promise.all([clearSession(), client.removeTokens()]);
  }

  async getCachedSession(): Promise<AuthSession | undefined> {
    const existing = await this.readStaffSession();
    if (existing && !isAccessTokenExpired(existing)) {
      return existing;
    }
    if (existing && !isRefreshTokenExpired(existing)) {
      try {
        return await this.persist(await postForTokens("/auth/refresh", { refreshToken: existing.refreshToken }));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  async getSession(): Promise<AuthSession> {
    const existing = await this.readStaffSession();
    if (existing && !isAccessTokenExpired(existing)) {
      return existing;
    }

    if (!this.inFlight) {
      this.inFlight = this.establishSession(existing).finally(() => {
        this.inFlight = undefined;
      });
    }

    return this.inFlight;
  }

  private async readStaffSession(): Promise<AuthSession | undefined> {
    const existing = await readSession();
    if (existing?.email.toLowerCase() === FALLBACK_ADMIN_EMAIL) {
      await this.signOut();
      return undefined;
    }
    return existing;
  }

  private async establishSession(existing: AuthSession | undefined): Promise<AuthSession> {
    if (existing && !isRefreshTokenExpired(existing)) {
      try {
        return await this.persist(await postForTokens("/auth/refresh", { refreshToken: existing.refreshToken }));
      } catch {
        return this.persist(await this.connect());
      }
    }

    return this.persist(await this.connect());
  }

  private async persist(session: AuthSession): Promise<AuthSession> {
    await writeSession(session);
    const expiresIn = Math.max(1, Math.floor((Date.parse(session.accessTokenExpiresAt) - Date.now()) / 1000));
    await client.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn,
    });
    return session;
  }

  private async connect(): Promise<AuthSession> {
    const request = await client.authorizationRequest({
      endpoint: `${getWebAppUrl()}/connect/raycast`,
      clientId: "ipf-os-raycast",
      scope: "tickets",
    });
    const { authorizationCode } = await client.authorize(request);
    return postForTokens("/auth/device/token", {
      code: authorizationCode,
      codeVerifier: request.codeVerifier,
      redirectUri: request.redirectURI,
    });
  }
}
