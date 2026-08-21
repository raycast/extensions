export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  subject: string;
  email: string;
  role: string;
}

export interface AuthProvider {
  getAccessToken(): Promise<string>;
  invalidateAccessToken(): Promise<void>;
  getSession(): Promise<AuthSession>;
  getCachedSession(): Promise<AuthSession | undefined>;
  signOut(): Promise<void>;
}
