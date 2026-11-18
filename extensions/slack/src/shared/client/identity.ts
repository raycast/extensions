import { createHash } from "node:crypto";

type Identity = { id?: string; username?: string; teamId?: string };
export type AccountIdentity = { accountKey: string; identity: Identity & { id: string; teamId: string } };

export function identityCacheKey(token: string | undefined): string | undefined {
  return token ? createHash("sha256").update(token).digest("hex") : undefined;
}

export async function loadAccountIdentity(
  accountKey: string | undefined,
  load: () => Promise<Identity>,
): Promise<AccountIdentity> {
  if (!accountKey) throw new Error("Sign in to Slack to load your workspace");
  const identity = await load();
  if (!identity.id || !identity.teamId) throw new Error("Slack did not return your user and workspace IDs");
  return { accountKey, identity: { ...identity, id: identity.id, teamId: identity.teamId } };
}

export function identityForAccount(data: AccountIdentity | undefined, accountKey: string | undefined) {
  // Cached hooks may briefly retain a previous result when their arguments change.
  return accountKey && data?.accountKey === accountKey ? data.identity : undefined;
}
