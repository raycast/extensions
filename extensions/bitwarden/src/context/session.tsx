import { Detail, getPreferenceValues, LocalStorage } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import UnlockForm from "~/components/UnlockForm";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { Preferences } from "~/types/preferences";
import { SessionState } from "~/types/session";
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

const initialState: SessionState = {
  token: undefined,
  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
  passwordHash: undefined,
  lastActivityTime: undefined,
};

export type SessionProviderProps = PropsWithChildren<{
  unlock?: boolean;
}>;

/**
 * Component which provides a session via the {@link useSession} hook.
 * @param props.unlock If true, an unlock form will be displayed if the vault is locked or unauthenticated.
 */
export function SessionProvider(props: SessionProviderProps) {
  const { unlock, children } = props;
  const bitwarden = useBitwarden();
  const [state, setState] = useReducer(
    (previous: SessionState, next: Partial<SessionState>) => ({ ...previous, ...next }),
    initialState
  );

  const active = !state.isLoading && state.isAuthenticated && !state.isLocked;

  useEffect(() => {
    // Load the saved session token from LocalStorage.
    loadSavedSession();
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
      const vaultTimeoutMs = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
      const [token, passwordHash, lastActivityTimeString] = await Promise.all([
        LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
        LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
        LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
      ]);

      let lastActivityTime: Date | undefined;
      if (!token || !passwordHash) throw new NoAuthenticationError();

      if (lastActivityTimeString && vaultTimeoutMs >= 0) {
        const lockReason = "Vault timed out due to inactivity";
        if (vaultTimeoutMs === 0) throw new VaultTimedOutError(lockReason);

        lastActivityTime = new Date(lastActivityTimeString);
        const timeElapseSinceLastPasswordEnter = lastActivityTime ? Date.now() - lastActivityTime.getTime() : 0;
        if (lastActivityTime != null && timeElapseSinceLastPasswordEnter >= vaultTimeoutMs) {
          throw new VaultTimedOutError(lockReason);
        }
      }

      setState({ token, passwordHash, lastActivityTime, isAuthenticated: true, isLocked: false });
    } catch (error) {
      const reason = error instanceof VaultTimedOutError ? error.message : undefined;
      const { status } = await bitwarden.status();
      await clearSessionStorage();
      if (status !== "unauthenticated") {
        await bitwarden.lock(reason);
      }
    }
  }

  async function clearSessionStorage() {
    await Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
    ]);
  }

  async function handleUnlock(token: string, passwordHash: string) {
    await Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_HASH, passwordHash),
    ]);
    setState({ token, passwordHash, isLocked: false });
  }

  async function handleLock(reason?: string) {
    await bitwarden.lock(reason);
    await clearSessionStorage();
    setState({ token: undefined, passwordHash: undefined, isLocked: true });
  }

  async function handleLogout() {
    await bitwarden.logout();
    await clearSessionStorage();
    setState({ token: undefined, passwordHash: undefined, isAuthenticated: false });
  }

  async function confirmMasterPassword(password: string): Promise<boolean> {
    const enteredPasswordHash = await hashMasterPasswordForReprompting(password);
    return enteredPasswordHash === state.passwordHash;
  }

  const value: Session = useMemo(
    () => ({
      token: state.token,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      isLocked: state.isLocked,
      active,
      lock: handleLock,
      logout: handleLogout,
      confirmMasterPassword,
    }),
    [state, active, handleLock, handleLogout, confirmMasterPassword]
  );

  if (state.isLoading) return <Detail isLoading />;

  const needsUnlockForm = state.isLocked || !state.isAuthenticated;

  return (
    <SessionContext.Provider value={value}>
      {needsUnlockForm && unlock ? <UnlockForm onUnlock={handleUnlock} /> : state.token ? children : null}
    </SessionContext.Provider>
  );
}

class NoAuthenticationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "NoAuthenticationError";
  }
}
class VaultTimedOutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ShouldLockVaultError";
  }
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session == null) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return session;
}

export default SessionProvider;
