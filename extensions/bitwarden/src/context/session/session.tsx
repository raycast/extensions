import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { createContext, PropsWithChildren, ReactNode, useContext, useMemo, useRef } from "react";
import UnlockForm from "~/components/UnlockForm";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";
import { LOCAL_STORAGE_KEY, VAULT_LOCK_MESSAGES } from "~/constants/general";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { useBitwarden } from "~/context/bitwarden";
import { useSessionReducer } from "~/context/session/reducer";
import {
  checkSystemLockedSinceLastAccess,
  checkSystemSleptSinceLastAccess,
  SessionStorage,
} from "~/context/session/utils";
import { SessionState } from "~/types/session";
import { Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import useOnceEffect from "~/utils/hooks/useOnceEffect";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type Session = {
  active: boolean;
  confirmMasterPassword: (password: string) => Promise<boolean>;
} & Pick<SessionState, "token" | "isLoading" | "isLocked" | "isAuthenticated">;

export const SessionContext = createContext<Session | null>(null);

export type SessionProviderProps = PropsWithChildren<{
  loadingFallback?: ReactNode;
  unlock?: boolean;
}>;

/**
 * Component which provides a session via the {@link useSession} hook.
 * @param props.unlock If true, an unlock form will be displayed if the vault is locked or unauthenticated.
 */
export function SessionProvider(props: SessionProviderProps) {
  const { children, loadingFallback = <VaultLoadingFallback />, unlock } = props;

  const bitwarden = useBitwarden();
  const [state, dispatch] = useSessionReducer();
  const pendingActionRef = useRef<Promise<any>>(Promise.resolve());

  useOnceEffect(bootstrapSession, bitwarden);

  async function bootstrapSession() {
    try {
      bitwarden
        .setActionListener("lock", handleLock)
        .setActionListener("unlock", handleUnlock)
        .setActionListener("logout", handleLogout);

      const [token, passwordHash, lastActivityTimeString, lastVaultStatus] = await SessionStorage.getSavedSession();
      if (!token || !passwordHash) throw new LockVaultError();

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
        pendingActionRef.current = bitwarden.lock({ reason: error.message, immediate: true, checkVaultStatus: true });
      } else if (error instanceof LogoutVaultError) {
        pendingActionRef.current = bitwarden.logout({ reason: error.message, immediate: true });
      } else {
        pendingActionRef.current = bitwarden.lock({ immediate: true });
        dispatch({ type: "failLoadingSavedState" });
        captureException("Failed to bootstrap session state", error);
      }
    }
  }

  async function handleUnlock(password: string, token: string) {
    const passwordHash = await hashMasterPasswordForReprompting(password);
    await SessionStorage.saveSession(token, passwordHash);
    await LocalStorage.removeItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);
    dispatch({ type: "unlock", token, passwordHash });
  }

  async function handleLock(reason?: string) {
    await SessionStorage.clearSession();
    if (reason) await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON, reason);
    dispatch({ type: "lock" });
  }

  async function handleLogout(reason?: string) {
    await SessionStorage.clearSession();
    Cache.clear();
    if (reason) await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON, reason);
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

  if (state.isLoading) return loadingFallback;

  const showUnlockForm = state.isLocked || !state.isAuthenticated;
  const _children = state.token ? children : null;

  return (
    <SessionContext.Provider value={contextValue}>
      {showUnlockForm && unlock ? <UnlockForm pendingAction={pendingActionRef.current} /> : _children}
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
