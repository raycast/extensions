import { auth, gmail as gmailclient, gmail_v1 } from "@googleapis/gmail";

export type GmailTokens = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
  expiresIn?: number;
};

export function createGmailClient(clientId: string, tokens?: GmailTokens): gmail_v1.Gmail {
  const oAuth2Client = new auth.OAuth2({
    clientId,
    // Gaxios's dynamic node-fetch import is not callable in Raycast's shared dependency bundles.
    transporterOptions: { fetchImplementation: globalThis.fetch },
  });
  oAuth2Client.setCredentials({
    access_token: tokens?.accessToken,
    refresh_token: tokens?.refreshToken,
    id_token: tokens?.idToken,
    scope: tokens?.scope,
    expiry_date: tokens?.expiresIn,
  });
  return gmailclient({ version: "v1", auth: oAuth2Client });
}
