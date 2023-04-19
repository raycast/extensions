import { Detail, List } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef } from "react";
import UnlockForm from "~/components/UnlockForm";
import { useBitwarden } from "~/context/bitwarden";
import { useSessionReducer } from "~/context/session/reducer";
import { getSavedSession, Storage } from "~/context/session/utils";
import { Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type Session = {
  active: boolean;
  token: string | undefined;
  isLoading: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  confirmMasterPassword: (password: string) => Promise<boolean>;
  lock: (reason?: string) => Promise<void>;
  logout: () => Promise<void>;
};

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
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!bitwarden || isInitialized.current) return;
    loadSavedSession();
    isInitialized.current = true;
  }, [bitwarden]);

  useEffect(() => {
    // check if the vault is locked or unauthenticated in the background
    if (!state.token) return;
    const checkVaultStatus = async () => {
      const status = await bitwarden.checkLockStatus(state.token);
      if (status === "unauthenticated") return await handleLogout();
      if (status === "locked") return await handleLock();
    };
    checkVaultStatus();
  }, [state.token]);

  async function loadSavedSession() {
    try {
      const { shouldLockVault, lockReason, ...savedSession } = await getSavedSession();

      dispatch({ type: "loadSavedState", shouldLockVault, lockReason, ...savedSession });

      if (shouldLockVault) {
        const { status } = await bitwarden.status();
        if (status !== "unauthenticated") {
          await bitwarden.lock(lockReason);
        }
        await Storage.clearSession();
      }
    } catch (error) {
      await handleLock();
      dispatch({ type: "failedLoadSavedState" });
      captureException("Failed to load saved session state", error);
    }
  }

  async function handleUnlock(password: string) {
    const token = await bitwarden.unlock(password);
    const passwordHash = await hashMasterPasswordForReprompting(password);
    await Storage.saveSession(token, passwordHash);
    dispatch({ type: "unlock", token, passwordHash });
  }

  async function handleLock(reason?: string) {
    await bitwarden.lock(reason);
    await Storage.clearSession();
    dispatch({ type: "lock", lockReason: reason });
  }

  async function handleLogout() {
    await bitwarden.logout();
    await Storage.clearSession();
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
      lock: handleLock,
      logout: handleLogout,
      confirmMasterPassword,
    }),
    [state, handleLock, handleLogout, confirmMasterPassword]
  );

  if (state.isLoading) return <List isLoading />;

  const showUnlockForm = state.isLocked || !state.isAuthenticated;
  const children = state.token ? props.children : null;
  return (
    <SessionContext.Provider value={contextValue}>
      {showUnlockForm && props.unlock ? <UnlockForm onUnlock={handleUnlock} lockReason={state.lockReason} /> : children}
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
