import { Icon, OAuth } from "@raycast/api";

const oauthClients = new Map<string, OAuth.PKCEClient>();

export function getOAuthClient(accountId: string, accountName: string): OAuth.PKCEClient {
  const existingClient = oauthClients.get(accountId);
  if (existingClient) return existingClient;

  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.AppURI,
    providerName: `Google (${accountName})`,
    providerIcon: Icon.Link,
    providerId: `google-${accountId}`,
    description: `Connect your ${accountName} Google account to access 2FA codes`,
  });

  oauthClients.set(accountId, client);
  return client;
}

export function clearOAuthClient(accountId: string): void {
  oauthClients.delete(accountId);
}
