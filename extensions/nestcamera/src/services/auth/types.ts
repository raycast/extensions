import { OAuth } from "@raycast/api";

export type OAuth2Token = OAuth.TokenSet;

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  projectId: string;
  redirectUri?: string;
  scope: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
} 