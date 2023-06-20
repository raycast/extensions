import { List } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import UnlockForm from "~/components/UnlockForm";
import { useBitwarden } from "~/context/bitwarden";
import { useSessionReducer } from "~/context/session/reducer";
import { getSavedSession, SessionStorage } from "~/context/session/utils";
import { Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import { VaultIsLockedError } from "~/utils/errors";
import useOnceEffect from "~/utils/hooks/useOnceEffect";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type Session = {
  active: boolean;
  token: string | undefined;
  isLoading: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  confirmMasterPassword: (password: string) => Promise<boolean>;
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

  useOnceEffect(async () => {
    try {
      bitwarden
        .setActionCallback("lock", handleLock)
        .setActionCallback("unlock", handleUnlock)
        .setActionCallback("logout", handleLogout);

      const restoredSession = await getSavedSession();
      if (restoredSession.token) bitwarden.setSessionToken(restoredSession.token);
      dispatch({ type: "loadSavedState", ...restoredSession });
      if (restoredSession.shouldLockVault) await bitwarden.lock(restoredSession.lockReason, true);
    } catch (error) {
      if (!(error instanceof VaultIsLockedError)) await bitwarden.lock();
      dispatch({ type: "failedLoadSavedState" });
      captureException("Failed to load saved session state", error);
    }
  }, bitwarden);

  async function handleUnlock(password: string, token: string) {
    const passwordHash = await hashMasterPasswordForReprompting(password);
    await SessionStorage.saveSession(token, passwordHash);
    dispatch({ type: "unlock", token, passwordHash });
  }

  async function handleLock(reason?: string) {
    await SessionStorage.clearSession();
    dispatch({ type: "lock", lockReason: reason });
  }

  async function handleLogout() {
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

  if (state.isLoading) return <List isLoading />;

  const showUnlockForm = state.isLocked || !state.isAuthenticated;
  const children = state.token ? props.children : null;
  return (
    <SessionContext.Provider value={contextValue}>
      {showUnlockForm && props.unlock ? <UnlockForm lockReason={state.lockReason} /> : children}
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
