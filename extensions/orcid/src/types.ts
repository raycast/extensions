export interface Preferences {
  clientId: string;
  clientSecret: string;
  useSandbox: boolean;
}

export interface OrcidTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  name: string;
  orcid: string;
}
