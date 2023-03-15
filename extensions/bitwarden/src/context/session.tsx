import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import { Bitwarden } from "~/api/bitwarden";
import UnlockForm from "~/components/UnlockForm";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { Preferences, VaultStatus } from "~/types/general";
import { SessionState } from "~/types/session";

export type Session = {
  active: boolean;
  token: string | undefined;
  isLoading: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  lock: (reason?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

const initialState: SessionState = {
  token: undefined,
  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
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

  async function loadSavedSession() {
    const repromptIgnoreDuration = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
    const [token, lastActivityTimeString] = await Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
    ]);

    let lastActivityTime: Date | undefined;
    const currentTime = new Date();

    if (lastActivityTimeString) {
      lastActivityTime = new Date(lastActivityTimeString);
      const timeElapseSinceLastPasswordEnter = lastActivityTime
        ? currentTime.getTime() - lastActivityTime.getTime()
        : 0;
      const shouldLock = lastActivityTime != null && timeElapseSinceLastPasswordEnter >= repromptIgnoreDuration;

      if (token && shouldLock) {
        await bitwarden.lock("Vault timed out due to inactivity");
        await deleteToken();
        return;
      }
    }

    await update({ token, lastActivityTime });
  }

  /**
   * Determines the current status of the session.
   *
   * This is done by trying to get the list of items and seeing how the command responds to that.
   * Note: Cannot use `bw status` due to a bug.
   *
   * @see https://github.com/bitwarden/clients/issues/2729
   * @see https://github.com/raycast/extensions/pull/3413#discussion_r1014624155
   */
  async function getSessionStatus(api: Bitwarden, token: string | undefined): Promise<VaultStatus> {
    if (token == null) return "unauthenticated";

    try {
      await api.listItems(token ?? "");
      return "unlocked";
    } catch {
      // Failed. Probably locked.
      return "locked";
    }
  }

  /**
   * Refresh the state of the session provider.
   * This updates the component state.
   *
   * @param newState The state to update.
   */
  async function update(newState: Partial<SessionState>): Promise<void> {
    let updatedState = { ...newState };
    if ("token" in newState) {
      const status = await getSessionStatus(bitwarden, newState.token);

      updatedState = {
        ...newState,
        isLoading: false,
        isLocked: status === "locked" || status === "unauthenticated",
        isAuthenticated: status !== "unauthenticated",
      };
    }

    setState(updatedState);
  }

  async function setToken(token: string) {
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token);
    await update({ token });
  }

  async function deleteToken() {
    await LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN);
    await update({ token: undefined });
  }

  async function lockVault() {
    const toast = await showToast({ title: "Locking Vault...", style: Toast.Style.Animated });
    await bitwarden.lock("Manually locked by the user");
    await deleteToken();
    await toast.hide();
  }

  async function logoutVault() {
    const toast = await showToast({ title: "Logging Out...", style: Toast.Style.Animated });
    await bitwarden.logout();
    await deleteToken();
    await toast.hide();
  }

  const value: Session = useMemo(
    () => ({
      token: state.token,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      isLocked: state.isLocked,
      active,
      lock: lockVault,
      logout: logoutVault,
    }),
    [state, active, lockVault, logoutVault]
  );

  const needsUnlockForm = !state.isLoading && (state.isLocked || !state.isAuthenticated);

  return (
    <SessionContext.Provider value={value}>
      {needsUnlockForm && unlock ? <UnlockForm onUnlock={setToken} /> : children}
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

export default SessionProvider;
