import { useEffect, useRef, useState } from "react";
import { fakerKey } from "@chrismessina/raycast-faker";
import { LocalStorage } from "@raycast/api";
import { hasLogin, MercuryLogin } from "./logins";
import {
  Account,
  CreditAccount,
  getAccounts,
  getCreditAccounts,
  getTreasuryAccounts,
  log,
  MercuryForbiddenError,
  toError,
  TreasuryAccount,
} from "./mercury";

/**
 * The last balances fetched for one Mercury login. Kept in LocalStorage (Raycast's encrypted
 * database) so lists open instantly and the menu bar works offline. Transactions are never
 * stored; they're fetched live.
 */
export interface Snapshot {
  accounts: Account[];
  credit: CreditAccount[];
  /** Undefined until Treasury has answered at least once. Mercury takes ~10 s to return it. */
  treasury?: TreasuryAccount[];
  /** When the request that fetched `treasury` started, so an older, slower one can't replace it. */
  treasuryAt?: string;
  updatedAt: string;
}

const snapshotKey = (loginId: string) => fakerKey(`balances:${loginId}`);

export async function readSnapshot(loginId: string): Promise<Snapshot | undefined> {
  const raw = await LocalStorage.getItem<string>(snapshotKey(loginId));
  return raw ? (JSON.parse(raw) as Snapshot) : undefined;
}

async function writeSnapshot(loginId: string, snapshot: Snapshot) {
  await LocalStorage.setItem(snapshotKey(loginId), JSON.stringify(snapshot));
}

/** Saves in flight per login. Each waits for the one before it, so two reads never race one write. */
const saving = new Map<string, Promise<unknown>>();

/**
 * Write a snapshot unless the login was removed in the meantime (a Treasury response can arrive
 * ~10 s after Remove). `update` sees what's saved now and returns undefined to keep it, so an
 * older request can't overwrite a newer one. Returns the snapshot that is saved afterward.
 */
async function save(
  loginId: string,
  update: (saved?: Snapshot) => Snapshot | undefined,
): Promise<Snapshot | undefined> {
  // ponytail: serialized within this command only; two commands (menu bar and a list) can still interleave.
  const run = (saving.get(loginId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (!(await hasLogin(loginId))) return undefined;
      const saved = await readSnapshot(loginId);
      const next = update(saved);
      if (next) await writeSnapshot(loginId, next);
      return next ?? saved;
    });
  saving.set(loginId, run);
  try {
    return await run;
  } finally {
    if (saving.get(loginId) === run) saving.delete(loginId);
  }
}

/** Fetch accounts and credit (fast), then Treasury (slow), saving after each so neither waits on the other. */
export async function refreshSnapshot(
  login: MercuryLogin,
  onUpdate: (snapshot: Snapshot, part: "accounts" | "treasury") => void = () => {},
): Promise<Snapshot> {
  const startedAt = new Date().toISOString();
  const treasury = getTreasuryAccounts(login.token);
  // Awaited below; this stops a rejection from going unhandled if accounts fail first.
  treasury.catch(() => {});
  const [accounts, credit] = await Promise.all([getAccounts(login.token), getCreditAccounts(login.token)]);
  const fresh: Snapshot = { accounts, credit, updatedAt: startedAt };
  let snapshot =
    (await save(login.id, (saved) =>
      saved && saved.updatedAt > startedAt
        ? undefined
        : { ...fresh, treasury: saved?.treasury, treasuryAt: saved?.treasuryAt },
    )) ?? fresh;
  onUpdate(snapshot, "accounts");

  try {
    const treasuryAccounts = await treasury;
    snapshot = (await save(login.id, (saved) =>
      saved?.treasuryAt && saved.treasuryAt > startedAt
        ? undefined
        : { ...(saved ?? fresh), treasury: treasuryAccounts, treasuryAt: startedAt },
    )) ?? { ...snapshot, treasury: treasuryAccounts, treasuryAt: startedAt };
    onUpdate(snapshot, "treasury");
  } catch (error) {
    log.log("Treasury unavailable:", error instanceof Error ? error.message : String(error));
    // A 403 means this organization has no Treasury. Any other failure keeps the newest saved value
    // (undefined if Treasury never answered), so a total never quietly drops Treasury, a newer
    // refresh's result isn't replaced, and the next refresh retries.
    const forbidden = error instanceof MercuryForbiddenError;
    snapshot = (await save(login.id, (saved) =>
      forbidden && !(saved?.treasuryAt && saved.treasuryAt > startedAt)
        ? { ...(saved ?? snapshot), treasury: [], treasuryAt: startedAt }
        : undefined,
    )) ?? { ...snapshot, treasury: forbidden ? [] : snapshot.treasury };
    onUpdate(snapshot, "treasury");
  }
  return snapshot;
}

export interface LoginBalances {
  snapshot?: Snapshot;
  isLoadingAccounts: boolean;
  isLoadingTreasury: boolean;
  error?: Error;
}

/**
 * Cached balances for every login, shown immediately, then refreshed in the background.
 * `refresh()` refetches everything.
 */
export function useBalances(logins: MercuryLogin[] | undefined) {
  const [balances, setBalances] = useState<Record<string, LoginBalances>>({});
  const [generation, setGeneration] = useState(0);
  // Effect dependencies live only in memory, so the token itself can detect an updated token.
  const loginKey = logins?.map((login) => `${login.id}:${login.token}`).join(",");
  const current = useRef(logins);
  current.current = logins;

  useEffect(() => {
    const list = current.current;
    if (!list) return;
    let cancelled = false;
    const update = (id: string, patch: Partial<LoginBalances>) => {
      if (!cancelled) setBalances((state) => ({ ...state, [id]: { ...state[id], ...patch } as LoginBalances }));
    };

    for (const login of list) {
      update(login.id, { isLoadingAccounts: true, isLoadingTreasury: true, error: undefined });
      // The cache read can resolve after the fresh accounts arrive, so it only fills an empty slot.
      readSnapshot(login.id).then((snapshot) => {
        if (!cancelled && snapshot)
          setBalances((state) =>
            state[login.id]?.snapshot ? state : { ...state, [login.id]: { ...state[login.id], snapshot } },
          );
      });
      refreshSnapshot(login, (snapshot, part) =>
        update(
          login.id,
          part === "accounts" ? { snapshot, isLoadingAccounts: false } : { snapshot, isLoadingTreasury: false },
        ),
      ).catch((error) => {
        log.error("Couldn't refresh balances", {
          login: login.name,
          reason: error instanceof Error ? error.message : String(error),
        });
        update(login.id, {
          error: toError(error),
          isLoadingAccounts: false,
          isLoadingTreasury: false,
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [loginKey, generation]);

  return { balances, refresh: () => setGeneration((value) => value + 1) };
}
