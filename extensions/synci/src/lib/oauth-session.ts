export class SignInRequiredError extends Error {
  constructor() {
    super("Your Synci session has expired or was revoked. Sign in again to continue.");
  }
}

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  isExpired: () => boolean;
}
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}
export interface OAuthAdapter {
  getTokens(): Promise<StoredTokens | undefined>;
  setTokens(tokens: TokenResponse): Promise<void>;
  removeTokens(): Promise<void>;
  authorize(forceConsent?: boolean): Promise<{ code: string; verifier: string; redirect: string }>;
}

/** Single-flight token rotation within a command; credentials live only in Raycast's OAuth store. */
export class OAuthSession {
  private pending?: Promise<string>;
  private reconnecting?: Promise<string>;
  private generation = 0;
  private tokenWrites: Promise<void> = Promise.resolve();
  constructor(
    private adapter: OAuthAdapter,
    private clientId: string,
    private tokenUrl: string,
    private transport: typeof fetch = fetch,
  ) {}

  async accessToken(interactive = false): Promise<string> {
    if (!this.clientId) throw new Error("The Synci OAuth app is not configured in this development build.");
    if (this.reconnecting) return this.reconnecting;
    if (!this.pending)
      this.pending = this.acquire(interactive).finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  /** Keep the current grant until fresh consent and token exchange succeed. */
  async reconnect(): Promise<string> {
    if (!this.clientId) throw new Error("The Synci OAuth app is not configured in this development build.");
    if (!this.reconnecting) {
      const generation = this.generation;
      this.reconnecting = (async () => {
        // Let any token rotation finish before replacing the grant.
        await this.pending?.catch(() => {});
        if (generation !== this.generation) throw new SignInRequiredError();
        return this.authorize(generation, true);
      })().finally(() => {
        this.reconnecting = undefined;
      });
    }
    return this.reconnecting;
  }

  async disconnect() {
    this.generation++;
    await this.updateTokens(() => this.adapter.removeTokens());
  }

  private assertCurrent(generation: number) {
    if (generation !== this.generation) throw new SignInRequiredError();
  }

  private updateTokens(update: () => Promise<void>): Promise<void> {
    // Sign-out must remove credentials after any token write already in progress.
    const write = this.tokenWrites.then(update);
    this.tokenWrites = write.catch(() => {});
    return write;
  }

  private async acquire(interactive: boolean): Promise<string> {
    const generation = this.generation;
    await this.tokenWrites;
    this.assertCurrent(generation);
    const stored = await this.adapter.getTokens();
    this.assertCurrent(generation);
    if (stored?.accessToken && !stored.isExpired()) return stored.accessToken;
    if (stored?.refreshToken) {
      try {
        return await this.exchange(
          { grant_type: "refresh_token", refresh_token: stored.refreshToken },
          generation,
          stored.refreshToken,
        );
      } catch (error) {
        if (!(error instanceof SignInRequiredError)) throw error;
        this.assertCurrent(generation);
        await this.updateTokens(async () => {
          this.assertCurrent(generation);
          await this.adapter.removeTokens();
        });
        if (!interactive) throw error;
      }
    }
    if (!interactive) throw new SignInRequiredError();
    return this.authorize(generation);
  }

  private async authorize(generation: number, forceConsent = false): Promise<string> {
    this.assertCurrent(generation);
    const { code, verifier, redirect } = await this.adapter.authorize(forceConsent);
    this.assertCurrent(generation);
    return this.exchange(
      { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirect },
      generation,
    );
  }

  private async exchange(
    params: Record<string, string>,
    generation: number,
    previousRefresh?: string,
  ): Promise<string> {
    let response: Response;
    try {
      response = await this.transport(this.tokenUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ ...params, client_id: this.clientId }),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      throw new Error("Could not reach Synci to sign in. Check your connection and try again.");
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (body.error === "invalid_grant") throw new SignInRequiredError();
      if (body.error === "invalid_client")
        throw new Error("Synci rejected the OAuth client. Verify that the shared app is a public PKCE client.");
      // Preserve rotating credentials on network, rate-limit, and server failures.
      throw new Error(
        response.status === 429
          ? "Synci is busy. Wait a moment before trying to sign in again."
          : `Synci sign-in is temporarily unavailable (HTTP ${response.status}). Try again shortly.`,
      );
    }
    const tokens = (await response.json().catch(() => null)) as TokenResponse | null;
    if (
      !tokens ||
      typeof tokens.access_token !== "string" ||
      !tokens.access_token ||
      typeof tokens.expires_in !== "number" ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      (tokens.refresh_token !== undefined && typeof tokens.refresh_token !== "string")
    )
      throw new Error("Synci returned an invalid token response. Try signing in again.");
    await this.updateTokens(async () => {
      this.assertCurrent(generation);
      await this.adapter.setTokens({ ...tokens, refresh_token: tokens.refresh_token ?? previousRefresh });
    });
    this.assertCurrent(generation);
    return tokens.access_token;
  }
}
