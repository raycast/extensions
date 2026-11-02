import { LocalStorage } from "@raycast/api";

import { createSubstackClient, publicationOrigin } from "./substackClient";

export type AccountSummary = { id: string; label: string; publication: string };
export type AccountConnection = AccountSummary & { sessionCookie: string; connectCookie?: string };
export type RecoveryRecord = { accountId?: string; id: number; editorUrl: string; title: string; verified: boolean };
export type AccountsState = {
  version: 1;
  defaultAccountId?: string;
  accounts: AccountConnection[];
  recovery: RecoveryRecord[];
  legacyMigrated?: boolean;
};
const key = "substack.accounts.v1";
const corruptMessage =
  "Saved Substack data is invalid. Restore the encrypted local data or reset this extension's storage in Raycast before adding accounts.";

export function validRecovery(value: unknown): value is RecoveryRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as RecoveryRecord;
  if (
    !Number.isSafeInteger(r.id) ||
    r.id <= 0 ||
    typeof r.editorUrl !== "string" ||
    typeof r.title !== "string" ||
    typeof r.verified !== "boolean" ||
    (r.accountId !== undefined && typeof r.accountId !== "string")
  )
    return false;
  try {
    const url = new URL(r.editorUrl);
    return r.editorUrl === `${publicationOrigin(url.origin)}/publish/post/${r.id}`;
  } catch {
    return false;
  }
}

export function normalizeAccount(value: AccountConnection): AccountConnection {
  if (
    !value ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.label !== "string" ||
    !value.label.trim() ||
    typeof value.publication !== "string" ||
    typeof value.sessionCookie !== "string" ||
    (value.connectCookie !== undefined && typeof value.connectCookie !== "string")
  )
    throw new Error("Enter an account label, publication, and session cookie.");
  const { origin } = createSubstackClient(value);
  return {
    id: value.id,
    label: value.label.trim(),
    publication: new URL(origin).hostname.replace(/\.substack\.com$/, ""),
    sessionCookie: value.sessionCookie.trim(),
    ...(value.connectCookie?.trim() ? { connectCookie: value.connectCookie.trim() } : {}),
  };
}

export async function readState(): Promise<AccountsState> {
  let raw: string | undefined;
  try {
    raw = await LocalStorage.getItem<string>(key);
  } catch {
    throw new Error("Could not read saved Substack data. Try again before changing accounts.");
  }
  if (raw === undefined) return { version: 1, accounts: [], recovery: [] };
  try {
    const state = JSON.parse(raw) as AccountsState;
    if (
      !state ||
      state.version !== 1 ||
      !Array.isArray(state.accounts) ||
      (state.recovery !== undefined && !Array.isArray(state.recovery)) ||
      (state.defaultAccountId !== undefined && typeof state.defaultAccountId !== "string") ||
      (state.legacyMigrated !== undefined && typeof state.legacyMigrated !== "boolean")
    )
      throw new Error();
    state.accounts = state.accounts.map(normalizeAccount);
    if (new Set(state.accounts.map((a) => a.id)).size !== state.accounts.length) throw new Error();
    state.recovery ??= [];
    if (
      !state.recovery.every(
        (r) =>
          validRecovery(r) &&
          (!r.accountId ||
            state.accounts.some(
              (a) => a.id === r.accountId && r.editorUrl === `${publicationOrigin(a.publication)}/publish/post/${r.id}`,
            )),
      )
    )
      throw new Error();
    return state;
  } catch {
    throw new Error(corruptMessage);
  }
}

// Serialize read/modify/write operations in each command to preserve consecutive draft references.
let pending: Promise<unknown> = Promise.resolve();
export function updateState(update: (state: AccountsState) => void): Promise<void> {
  const task = pending.then(async () => {
    const state = await readState();
    update(state);
    try {
      await LocalStorage.setItem(key, JSON.stringify(state));
    } catch {
      throw new Error("Could not save Substack data. Existing account setup has been retained. Try again.");
    }
  });
  pending = task.catch(() => {});
  return task;
}
