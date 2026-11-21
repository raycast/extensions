import type { OAuth } from "@raycast/api";
import { parseUserTokens, requireScopes, slackRequest } from "./slack";

type TokenStore = Pick<OAuth.PKCEClient, "getTokens" | "setTokens">;

export async function freshAccessToken(clientId: string, store: TokenStore, callSlack = slackRequest): Promise<string> {
  const tokens = await store.getTokens();
  if (!tokens) throw new Error("Reconnect this workspace in Manage Workspaces.");
  if (!tokens.isExpired()) return tokens.accessToken;
  if (!tokens.refreshToken) throw new Error("Your connection expired. Reconnect this workspace.");
  const response = await callSlack(
    "oauth.v2.access",
    undefined,
    new URLSearchParams({ client_id: clientId, grant_type: "refresh_token", refresh_token: tokens.refreshToken }),
  );
  const refreshed = parseUserTokens(response);
  requireScopes(refreshed.scope ?? tokens.scope);
  await store.setTokens({ ...refreshed, scope: refreshed.scope ?? tokens.scope });
  return refreshed.accessToken;
}
