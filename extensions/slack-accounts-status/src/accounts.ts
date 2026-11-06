import { getPreferenceValues, OAuth } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { Account, StatusChange } from "./domain";
import { AccountResult, applyToAccount } from "./apply";
import { parseIdentity, parseUserTokens, requiredScopes, requireScopes, slackRequest } from "./slack";
import { readAccounts, withStateLock, writeAccounts } from "./state";
import { freshAccessToken } from "./tokens";

function oauthClient(providerId: string, workspaceName?: string) {
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.App,
    providerName: workspaceName ? `Slack · ${workspaceName}` : "Slack",
    providerIcon: "slack-accounts-status.png",
    providerId,
  });
}

export async function connectAccount(expected?: Account): Promise<Account> {
  const clientId = getPreferenceValues<{ slackClientId?: string }>().slackClientId?.trim();
  if (!clientId || !/^\d+\.\d+$/.test(clientId))
    throw new Error("Enter your Slack app's Client ID in extension preferences (for example, 123.456).");
  const providerId = `slack-${randomUUID()}`;
  const client = oauthClient(providerId, expected?.teamName);
  const request = await client.authorizationRequest({
    endpoint: "https://slack.com/oauth/v2/authorize",
    clientId,
    scope: "",
    extraParameters: { user_scope: requiredScopes.join(","), ...(expected ? { team: expected.teamId } : {}) },
  });
  const { authorizationCode } = await client.authorize(request);
  const response = await slackRequest(
    "oauth.v2.access",
    undefined,
    new URLSearchParams({
      client_id: clientId,
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
    }),
  );
  const tokens = parseUserTokens(response);
  requireScopes(tokens.scope);
  const identity = parseIdentity(await slackRequest("auth.test", tokens.accessToken, {}));
  if (expected && (identity.teamId !== expected.teamId || identity.userId !== expected.userId)) {
    throw new Error(
      `Authorize ${expected.userName} in ${expected.teamName} to reconnect this account. Use Connect Workspace to add a different account.`,
    );
  }
  return withStateLock(async () => {
    const accounts = await readAccounts();
    const id = `${identity.teamId}:${identity.userId}`;
    const previous = accounts.find((item) => item.id === id);
    if (previous && previous.clientId !== clientId) {
      throw new Error("Disconnect this account before connecting it with a different Slack app Client ID.");
    }
    if (previous?.state === "disconnecting") {
      throw new Error("Finish disconnecting this account in Manage Workspaces, then connect it again.");
    }
    const pending: Account = {
      ...identity,
      id,
      providerId: previous?.providerId ?? providerId,
      clientId,
      state: "connecting",
    };
    const others = accounts.filter((item) => item.id !== id);
    await writeAccounts([...others, pending]);
    await oauthClient(pending.providerId, pending.teamName).setTokens(tokens);
    const connected: Account = { ...pending, state: "ready" };
    await writeAccounts([...others, connected]);
    return connected;
  });
}

export async function disconnectAccount(id: string): Promise<void> {
  await withStateLock(async () => {
    const accounts = await readAccounts();
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    if (account.state !== "disconnecting") {
      await writeAccounts(accounts.map((item) => (item.id === id ? { ...item, state: "disconnecting" } : item)));
    }
    await oauthClient(account.providerId, account.teamName).removeTokens();
    await writeAccounts(accounts.filter((item) => item.id !== id));
  });
}

export async function applyToAccounts(
  selected: Account[],
  request: StatusChange,
  previous: AccountResult[] = [],
): Promise<AccountResult[]> {
  return withStateLock(async () => {
    const accounts = await readAccounts();
    return Promise.all(
      selected.map((selectedAccount) => {
        const current = accounts.find((item) => item.id === selectedAccount.id);
        return applyToAccount(
          current ?? selectedAccount,
          request,
          async () => {
            if (!current)
              throw new Error("This workspace was disconnected. Connect it again before applying a status.");
            if (current.state !== "ready") {
              throw new Error(
                "Finish connecting or disconnecting this account in Manage Workspaces before applying a status.",
              );
            }
            return freshAccessToken(current.clientId, oauthClient(current.providerId, current.teamName));
          },
          previous.find((result) => result.account.id === selectedAccount.id),
        );
      }),
    );
  });
}
