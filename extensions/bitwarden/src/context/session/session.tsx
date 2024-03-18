import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import UnlockForm from "~/components/UnlockForm";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";
import { CACHE_KEYS, VAULT_LOCK_MESSAGES } from "~/constants/general";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { useBitwarden } from "~/context/bitwarden";
import { useSessionReducer } from "~/context/session/reducer";
import {
  checkSystemLockedSinceLastAccess,
  checkSystemSleptSinceLastAccess,
  SessionStorage,
} from "~/context/session/utils";
import { SessionState } from "~/types/session";
import { Cache as Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import useOnceEffect from "~/utils/hooks/useOnceEffect";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type Session = {
  active: boolean;
  confirmMasterPassword: (password: string) => Promise<boolean>;
} & Pick<SessionState, "token" | "isLoading" | "isLocked" | "isAuthenticated">;

export const SessionContext = createContext<Session | null>(null);

export type SessionProviderProps = PropsWithChildren<{
  unlock?: boolean;
}>;

/**
 * Component which provides a session via the {@link useSession} hook.
 * @param props.unlock If true, an unlock form will be displayed if the vault is locked or unauthenticated.
 */
export function SessionProvider(props: SessionProviderProps) {
  const bitwarden = useBitwarden();
  const [state, dispatch] = useSessionReducer();
  const [_, setLockReason] = useCachedState<string>(CACHE_KEYS.LOCK_REASON);

  useOnceEffect(bootstrapSession, bitwarden);

  async function bootstrapSession() {
    try {
      bitwarden
        .setActionCallback("lock", handleLock)
        .setActionCallback("unlock", handleUnlock)
        .setActionCallback("logout", handleLogout);

      const [token, passwordHash, lastActivityTimeString, lastVaultStatus] = await SessionStorage.getSavedSession();
      if (!token || !passwordHash) throw new LockVaultError("No saved session found");

      dispatch({ type: "loadState", token, passwordHash });
      bitwarden.setSessionToken(token);

      if (bitwarden.wasCliUpdated) throw new LogoutVaultError(VAULT_LOCK_MESSAGES.CLI_UPDATED);
      if (lastVaultStatus === "locked") throw new LockVaultError();
      if (lastVaultStatus === "unauthenticated") throw new LogoutVaultError();

      if (lastActivityTimeString) {
        const lastActivityTime = new Date(lastActivityTimeString);

        const vaultTimeoutMs = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
        if (vaultTimeoutMs === VAULT_TIMEOUT.SYSTEM_LOCK) {
          if (await checkSystemLockedSinceLastAccess(lastActivityTime)) {
            throw new LockVaultError(VAULT_LOCK_MESSAGES.SYSTEM_LOCK);
          }
        } else if (vaultTimeoutMs === VAULT_TIMEOUT.SYSTEM_SLEEP) {
          if (await checkSystemSleptSinceLastAccess(lastActivityTime)) {
            throw new LockVaultError(VAULT_LOCK_MESSAGES.SYSTEM_SLEEP);
          }
        } else if (vaultTimeoutMs !== VAULT_TIMEOUT.NEVER) {
          const timeElapseSinceLastActivity = Date.now() - lastActivityTime.getTime();
          if (vaultTimeoutMs === VAULT_TIMEOUT.IMMEDIATELY || timeElapseSinceLastActivity >= vaultTimeoutMs) {
            throw new LockVaultError(VAULT_LOCK_MESSAGES.TIMEOUT);
          }
        }
      }

      dispatch({ type: "finishLoadingSavedState" });
    } catch (error) {
      if (error instanceof LockVaultError) {
        await handleLock(error.message);
        await bitwarden.lock(error.message, true);
      } else if (error instanceof LogoutVaultError) {
        await handleLogout(error.message);
        await bitwarden.logout();
      } else {
        await handleLock();
        await bitwarden.lock();
        dispatch({ type: "failLoadingSavedState" });
        captureException("Failed to load saved session state", error);
      }
    }
  }

  async function handleUnlock(password: string, token: string) {
    const passwordHash = await hashMasterPasswordForReprompting(password);
    await SessionStorage.saveSession(token, passwordHash);
    setLockReason(undefined);
    dispatch({ type: "unlock", token, passwordHash });
  }

  async function handleLock(reason?: string) {
    if (reason) setLockReason(reason);
    await SessionStorage.clearSession();
    dispatch({ type: "lock" });
  }

  async function handleLogout(reason?: string) {
    if (reason) setLockReason(reason);
    await SessionStorage.clearSession();
    Cache.clear();
    dispatch({ type: "logout" });
  }

  async function confirmMasterPassword(password: string): Promise<boolean> {
    const enteredPasswordHash = await hashMasterPasswordForReprompting(password);
    return enteredPasswordHash === state.passwordHash;
  }

  const contextValue: Session = useMemo(
    () => ({
      token: state.token,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      isLocked: state.isLocked,
      active: !state.isLoading && state.isAuthenticated && !state.isLocked,
      confirmMasterPassword,
    }),
    [state, confirmMasterPassword]
  );

  if (state.isLoading) return <VaultLoadingFallback />;

  const showUnlockForm = state.isLocked || !state.isAuthenticated;
  const children = state.token ? props.children : null;
  return (
    <SessionContext.Provider value={contextValue}>
      {showUnlockForm && props.unlock ? <UnlockForm /> : children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session == null) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return session;
}

class LockVaultError extends Error {
  constructor(lockReason?: string) {
    super(lockReason);
  }
}

class LogoutVaultError extends Error {
  constructor(lockReason?: string) {
    super(lockReason);
  }
}
