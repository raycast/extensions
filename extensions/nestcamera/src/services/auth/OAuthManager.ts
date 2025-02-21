import { OAuth, showToast, Toast } from "@raycast/api";
import { OAuth2Config, OAuth2Token, TokenResponse } from "./types";
import { getConfig, ConfigurationError } from "../../utils/config";
import crypto from "crypto";
import fetch from "node-fetch";

const OAUTH_SCOPE = [
  "https://www.googleapis.com/auth/sdm.service"
];

export class OAuthManager {
  private static instance: OAuthManager;
  private client: OAuth.PKCEClient;
  private config: OAuth2Config;
  private refreshTimer?: NodeJS.Timeout;
  private isAuthorizing = false;
  private refreshListeners: (() => void)[] = [];

  private constructor() {
    try {
      const preferences = getConfig();

      this.config = {
        clientId: preferences.clientId,
        clientSecret: preferences.clientSecret,
        projectId: preferences.projectId,
        scope: OAUTH_SCOPE,
      };

      this.client = new OAuth.PKCEClient({
        redirectMethod: OAuth.RedirectMethod.Web,
        providerName: "Google Nest",
        providerIcon: "command-icon.png",
        providerId: "google-nest",
        description: "Connect your Google Nest account to view your camera feeds"
      });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: error.message,
        });
      }
      throw error;
    }
  }

  public static getInstance(): OAuthManager {
    if (!OAuthManager.instance) {
      OAuthManager.instance = new OAuthManager();
    }
    return OAuthManager.instance;
  }

  private async generateCodeVerifier(): Promise<string> {
    return crypto.randomBytes(32).toString("base64url");
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    hash.update(verifier);
    return hash.digest("base64url");
  }

  private createTokenWithExpiry(
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number
  ): OAuth2Token {
    const updatedAt = new Date();
    return {
      accessToken,
      refreshToken,
      expiresIn,
      updatedAt,
      isExpired: () => {
        const expirationTime = updatedAt.getTime() + (expiresIn * 1000);
        // Consider token expired 5 minutes before actual expiration
        return Date.now() > (expirationTime - 300000);
      },
    };
  }

  public async getValidToken(): Promise<OAuth2Token> {
    try {
      const token = await this.client.getTokens();
      
      if (!token?.accessToken) {
        if (this.isAuthorizing) {
          return new Promise((resolve) => {
            const checkToken = async () => {
              const newToken = await this.client.getTokens();
              if (newToken?.accessToken) {
                resolve(newToken);
              } else {
                setTimeout(checkToken, 1000);
              }
            };
            checkToken();
          });
        }
        
        this.isAuthorizing = true;
        try {
          return await this.authorize();
        } finally {
          this.isAuthorizing = false;
        }
      }

      if (token.isExpired()) {
        return this.refreshToken(token);
      }

      return token;
    } catch (error) {
      console.error("Token validation error:", error);
      throw error;
    }
  }

  private async authorize(): Promise<OAuth2Token> {
    try {
      const verifier = await this.generateCodeVerifier();
      const challenge = await this.generateCodeChallenge(verifier);

      const authRequest = await this.client.authorizationRequest({
        endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: this.config.clientId,
        scope: this.config.scope.join(" "),
        extraParameters: {
          code_challenge: challenge,
          code_challenge_method: "S256",
          access_type: "offline",
          prompt: "consent",
          project_id: this.config.projectId,
          flowName: "GeneralOAuthFlow"
        }
      });
      
      const { authorizationCode } = await this.client.authorize(authRequest);
      const tokens = await this.fetchTokens(authorizationCode, verifier, authRequest);
      await this.client.setTokens(tokens);
      this.setupRefreshTimer(tokens);
      
      return tokens;
    } catch (error) {
      console.error("Authorization error:", error);
      await this.client.removeTokens();
      throw error;
    }
  }

  private async fetchTokens(
    authCode: string,
    codeVerifier: string,
    authRequest: OAuth.AuthorizationRequest
  ): Promise<OAuth2Token> {
    try {
      console.log("Fetching tokens with authorization code...");
      console.log("Using redirect URI:", authRequest.redirectURI);
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: authCode,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: authRequest.redirectURI,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Token fetch error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Failed to fetch tokens: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`
        );
      }

      const data = (await response.json()) as TokenResponse;
      console.log("Received token response:", {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in
      });

      const token = this.createTokenWithExpiry(
        data.access_token,
        data.refresh_token,
        data.expires_in
      );

      // Immediately save the token
      console.log("Saving new tokens to secure storage...");
      await this.client.setTokens(token);
      console.log("Tokens saved successfully");

      return token;
    } catch (error) {
      console.error("Token fetch error:", error);
      throw error;
    }
  }

  public onTokenRefresh(callback: () => void) {
    this.refreshListeners.push(callback);
  }

  private async refreshToken(token: OAuth2Token): Promise<OAuth2Token> {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: token.refreshToken || "",
          grant_type: "refresh_token",
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Token refresh failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error("Failed to refresh token");
      }

      const data = (await response.json()) as TokenResponse;
      const newToken = this.createTokenWithExpiry(
        data.access_token,
        data.refresh_token || token.refreshToken,
        data.expires_in
      );
      
      await this.client.setTokens(newToken);
      this.setupRefreshTimer(newToken);
      this.refreshListeners.forEach(listener => listener());

      return newToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh token",
        message: "Please try authenticating again",
      });
      
      await this.client.removeTokens();
      return this.authorize();
    }
  }

  private setupRefreshTimer(token: OAuth2Token) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = (token.expiresIn || 3600) * 1000 - 300000;
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken(token).catch(console.error);
      }, refreshTime);
    }
  }

  public async clearTokens(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    await this.client.removeTokens();
  }
} 