import { randomUUID } from "node:crypto";

import {
  type AccountConnection,
  type AccountSummary,
  normalizeAccount,
  readState,
  updateState,
  validRecovery,
} from "./storage";
import { publicationOrigin } from "./substackClient";

export type { AccountConnection, AccountSummary, AccountsState } from "./storage";
export async function listAccounts(): Promise<AccountSummary[]> {
  return (await readState()).accounts.map(({ id, label, publication }) => ({ id, label, publication }));
}
export async function defaultAccountId(): Promise<string | undefined> {
  const state = await readState();
  return state.accounts.some((a) => a.id === state.defaultAccountId) ? state.defaultAccountId : undefined;
}
export async function resolveAccount(accountId?: string): Promise<AccountConnection> {
  const state = await readState();
  const account =
    accountId !== undefined
      ? state.accounts.find((a) => a.id === accountId)
      : (state.accounts.find((a) => a.id === state.defaultAccountId) ??
        (state.accounts.length === 1 ? state.accounts[0] : undefined));
  if (account) return { ...account };
  if (accountId !== undefined)
    throw new Error("That Substack account no longer exists. Use List Accounts to select a connection.");
  if (!state.accounts.length)
    throw new Error(
      "No Substack accounts are configured. Open Create Draft to import legacy preferences or Manage Accounts to add a connection.",
    );
  throw new Error(
    "Select a Substack account. Use List Accounts and choose a connection, or set a default in Manage Accounts.",
  );
}
export async function saveAccount(account: AccountConnection): Promise<void> {
  const normalized = normalizeAccount({
    ...account,
    label:
      account.label.trim() || new URL(publicationOrigin(account.publication)).hostname.replace(/\.substack\.com$/, ""),
  });
  await updateState((state) => {
    const previous = state.accounts.find((a) => a.id === normalized.id);
    if (previous && previous.publication !== normalized.publication)
      state.recovery = state.recovery.filter((r) => r.accountId !== normalized.id);
    state.accounts = [...state.accounts.filter((a) => a.id !== normalized.id), normalized];
  });
}
export async function removeAccount(accountId: string): Promise<void> {
  await updateState((state) => {
    state.accounts = state.accounts.filter((a) => a.id !== accountId);
    state.recovery = state.recovery.filter((r) => r.accountId !== accountId);
    if (state.defaultAccountId === accountId) delete state.defaultAccountId;
  });
}
export async function setDefaultAccount(accountId: string): Promise<void> {
  await updateState((state) => {
    if (!state.accounts.some((a) => a.id === accountId)) throw new Error("Select an existing account.");
    state.defaultAccountId = accountId;
  });
}
export async function migrateLegacyAccount(
  preferences: { publication?: string; sessionCookie?: string; connectCookie?: string },
  history: unknown[],
): Promise<void> {
  await updateState((state) => {
    if (state.legacyMigrated) return;
    let imported: AccountConnection | undefined;
    if (preferences.publication?.trim() && preferences.sessionCookie?.trim()) {
      imported = normalizeAccount({
        id: randomUUID(),
        label: "Imported account",
        publication: preferences.publication,
        sessionCookie: preferences.sessionCookie,
        connectCookie: preferences.connectCookie,
      });
      // A retry after a failed persistence never replaces a saved connection.
      state.accounts.push(imported);
      if (!state.defaultAccountId && state.accounts.length === 1) state.defaultAccountId = imported.id;
    }
    for (const value of history) {
      if (!value || typeof value !== "object") continue;
      const candidate = {
        title: `Draft ${(value as { id?: unknown }).id}`,
        verified: false,
        ...value,
        accountId: undefined,
      };
      if (!validRecovery(candidate)) continue;
      const record = {
        ...candidate,
        accountId:
          imported && new URL(candidate.editorUrl).origin === publicationOrigin(imported.publication)
            ? imported.id
            : undefined,
      };
      if (!state.recovery.some((r) => r.editorUrl === record.editorUrl && r.accountId === record.accountId))
        state.recovery.push(record);
    }
    // Stored atomically with accounts and recovery, so deletion cannot repeat the import.
    state.legacyMigrated = true;
  });
}
