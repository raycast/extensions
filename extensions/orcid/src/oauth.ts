import { OAuth, getPreferenceValues, LocalStorage } from "@raycast/api";
import { OrcidTokenResponse } from "./types";

interface Preferences {
  clientId: string;
  clientSecret: string;
  useSandbox: boolean;
}

const SANDBOX_AUTH_URL = "https://sandbox.orcid.org";
const PRODUCTION_AUTH_URL = "https://orcid.org";
const SANDBOX_API_URL = "https://pub.sandbox.orcid.org/v3.0";
const PRODUCTION_API_URL = "https://pub.orcid.org/v3.0";
const ORCID_ID_STORAGE_KEY = "orcid-id";

function getPrefs(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    clientId: prefs.clientId.trim(),
    clientSecret: prefs.clientSecret.trim(),
    useSandbox: prefs.useSandbox,
  };
}

export function getAuthBaseUrl(): string {
  const prefs = getPrefs();
  return prefs.useSandbox ? SANDBOX_AUTH_URL : PRODUCTION_AUTH_URL;
}

export function getApiBaseUrl(): string {
  const prefs = getPrefs();
  return prefs.useSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;
}

async function getStoredOrcidId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(ORCID_ID_STORAGE_KEY)) ?? null;
}

async function setStoredOrcidId(orcidId: string): Promise<void> {
  await LocalStorage.setItem(ORCID_ID_STORAGE_KEY, orcidId);
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "ORCID",
  providerIcon: "orcid-icon.png",
  providerId: "orcid",
  description: "Connect your ORCID account",
});

export async function getOrcidId(): Promise<string> {
  const storedId = await getStoredOrcidId();
  if (storedId) {
    return storedId;
  }

  // Need to authorize to get the ORCID iD
  const prefs = getPrefs();

  const authRequest = await client.authorizationRequest({
    endpoint: `${getAuthBaseUrl()}/oauth/authorize`,
    clientId: prefs.clientId,
    scope: "/authenticate",
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const response = await fetch(`${getAuthBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: prefs.clientId,
      client_secret: prefs.clientSecret,
      grant_type: "authorization_code",
      code: authorizationCode,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const data = (await response.json()) as OrcidTokenResponse;
  await setStoredOrcidId(data.orcid);
  await client.setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });

  return data.orcid;
}

export async function getReadPublicToken(): Promise<string> {
  const prefs = getPrefs();

  const response = await fetch(`${getAuthBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: prefs.clientId,
      client_secret: prefs.clientSecret,
      grant_type: "client_credentials",
      scope: "/read-public",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get API token: ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
