export interface StoredOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  updatedAt: Date;
  isExpired: boolean;
}
export interface AuthorizationRequest {
  codeVerifier: string;
  redirectURI: string;
  toURL(): string;
}
export interface ValidatedTokenResponse {
  access_token: string;
  token_type: "Bearer" | "bearer";
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}
export interface OAuthClientPort {
  authorizationRequest(options: {
    endpoint: string;
    clientId: string;
    scope: string;
    extraParameters: Record<string, string>;
  }): Promise<AuthorizationRequest>;
  authorize(request: AuthorizationRequest): Promise<{ authorizationCode: string }>;
  getTokens(): Promise<StoredOAuthTokens | undefined>;
  setTokens(response: ValidatedTokenResponse, previousRefreshToken?: string): Promise<void>;
  removeTokens(): Promise<void>;
}
