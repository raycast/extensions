import type { DeviceAuthorization, OAuthTokens } from "./oauth-protocol";

export interface StoredTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  updatedAt: Date;
  isExpired(): boolean;
}

export interface TokenStore {
  getTokens(): Promise<StoredTokenSet | undefined>;
  setTokens(tokens: OAuthTokens): Promise<void>;
  removeTokens(): Promise<void>;
}

export class AuthenticationError extends Error {
  constructor(message = "Your EveryAPI session expired. Sign in again.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

interface AuthSessionDependencies {
  store: TokenStore;
  start?: () => Promise<DeviceAuthorization>;
  poll?: (authorization: DeviceAuthorization) => Promise<OAuthTokens>;
  refresh?: (refreshToken: string) => Promise<OAuthTokens>;
  revoke?: (token: string) => Promise<void>;
}

export class AuthSession {
  private refreshInFlight?: Promise<string>;
  private readonly store: TokenStore;
  private readonly start: () => Promise<DeviceAuthorization>;
  private readonly poll: (
    authorization: DeviceAuthorization,
  ) => Promise<OAuthTokens>;
  private readonly refresh: (refreshToken: string) => Promise<OAuthTokens>;
  private readonly revoke: (token: string) => Promise<void>;

  constructor(dependencies: AuthSessionDependencies) {
    this.store = dependencies.store;
    this.start =
      dependencies.start ??
      (async () => {
        throw new Error("OAuth sign in is not configured");
      });
    this.poll =
      dependencies.poll ??
      (async () => {
        throw new Error("OAuth sign in is not configured");
      });
    this.refresh =
      dependencies.refresh ??
      (async () => {
        throw new Error("OAuth refresh is not configured");
      });
    this.revoke = dependencies.revoke ?? (async () => undefined);
  }

  async getAccessToken(forceRefresh = false): Promise<string | undefined> {
    const tokens = await this.store.getTokens();
    if (!tokens) return undefined;
    if (!forceRefresh && !tokens.isExpired()) return tokens.accessToken;
    if (!tokens.refreshToken) {
      await this.store.removeTokens();
      throw new AuthenticationError();
    }
    return this.refreshOnce(tokens.refreshToken);
  }

  private refreshOnce(refreshToken: string): Promise<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const next = await this.refresh(refreshToken);
        await this.store.setTokens(next);
        return next.accessToken;
      } catch {
        await this.store.removeTokens();
        throw new AuthenticationError();
      } finally {
        this.refreshInFlight = undefined;
      }
    })();
    return this.refreshInFlight;
  }

  startSignIn(): Promise<DeviceAuthorization> {
    return this.start();
  }

  async completeSignIn(authorization: DeviceAuthorization): Promise<string> {
    const tokens = await this.poll(authorization);
    await this.store.setTokens(tokens);
    return tokens.accessToken;
  }

  async signOut(): Promise<void> {
    const tokens = await this.store.getTokens();
    try {
      const token = tokens?.refreshToken || tokens?.accessToken;
      if (token) await this.revoke(token);
    } catch {
      // Local sign-out must remain available while offline.
    } finally {
      await this.store.removeTokens();
    }
  }
}
