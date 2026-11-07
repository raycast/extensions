import type { AdapterStatus, ItemAvailability, PasswordManagerAdapter, VaultItem } from "../types";
import { peekCredentials } from "./credential-vault";

const SESSION_LOCK_PATTERN = /session is locked|sessionlocked|unlock.{0,40}session/i;

function adapterNeedsAuth(status: AdapterStatus): boolean {
  return status.ok === false && status.needsAuth === true;
}

function isLikelySessionLockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return SESSION_LOCK_PATTERN.test(message);
}

async function silentUnlock(adapter: PasswordManagerAdapter): Promise<boolean> {
  const credentials = peekCredentials(adapter.id);
  if (!credentials || !adapter.authenticate) {
    return false;
  }

  try {
    const status = await adapter.authenticate(credentials);
    return status.ok;
  } catch {
    return false;
  }
}

async function withAutoUnlock<T>(adapter: PasswordManagerAdapter, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isLikelySessionLockError(error)) {
      throw error;
    }

    const unlocked = await silentUnlock(adapter);
    if (!unlocked) {
      throw error;
    }

    return run();
  }
}

export function wrapAdapterWithAutoUnlock(adapter: PasswordManagerAdapter): PasswordManagerAdapter {
  if (!adapter.authenticate) {
    return adapter;
  }

  const wrapped: PasswordManagerAdapter = {
    ...adapter,
    async isAvailable(): Promise<AdapterStatus> {
      const status = await adapter.isAvailable();
      if (!adapterNeedsAuth(status)) {
        return status;
      }

      const unlocked = await silentUnlock(adapter);
      return unlocked ? { ok: true } : status;
    },
    searchItems: (query: string) => withAutoUnlock(adapter, () => adapter.searchItems(query)),
    getPassword: (item: VaultItem) => withAutoUnlock(adapter, () => adapter.getPassword(item)),
    getUsername: (item: VaultItem) => withAutoUnlock(adapter, () => adapter.getUsername(item)),
    getEmail: (item: VaultItem) => withAutoUnlock(adapter, () => adapter.getEmail(item)),
    getTotp: (item: VaultItem) => withAutoUnlock(adapter, () => adapter.getTotp(item)),
  };

  if (adapter.listItems) {
    wrapped.listItems = () => withAutoUnlock(adapter, () => adapter.listItems!());
  }

  if (adapter.getUrl) {
    wrapped.getUrl = (item: VaultItem) => withAutoUnlock(adapter, () => adapter.getUrl!(item));
  }

  if (adapter.getItemAvailability) {
    wrapped.getItemAvailability = (item: VaultItem) =>
      withAutoUnlock(adapter, () => adapter.getItemAvailability!(item) as Promise<ItemAvailability>);
  }

  if (adapter.openInManager) {
    wrapped.openInManager = (item: VaultItem) => withAutoUnlock(adapter, () => adapter.openInManager!(item));
  }

  return wrapped;
}
