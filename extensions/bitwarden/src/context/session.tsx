import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import { Bitwarden } from "~/api/bitwarden";
import UnlockForm from "~/components/UnlockForm";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { VaultStatus } from "~/types/general";
import { Preferences } from "~/types/preferences";
import { SessionState } from "~/types/session";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type Session = {
  active: boolean;
  token: string | undefined;
  isLoading: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  canRepromptBeSkipped: () => boolean;
  confirmMasterPassword: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

const initialState: SessionState = {
  token: undefined,
  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
  repromptHash: undefined,
  passwordEnteredDate: undefined,
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
    (old: SessionState, update: Partial<SessionState>) => ({ ...old, ...update }),
    initialState
  );

  const active = !state.isLoading && state.isAuthenticated && !state.isLocked;

  useEffect(() => {
    // Load the saved session token from LocalStorage.
    loadSavedSession();
  }, [bitwarden]);

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

  /**
   * Set the session token and save it to LocalStorage.
   *
   * @param token The new session token.
   * @param passwordHash A hash of the user's master password.
   */
  async function setToken(token: string, passwordHash: string): Promise<void> {
    const now = new Date();
    await Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_HASH, passwordHash),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_PASSWORD_ENTERED, now.toString()),
    ]);

    await update({ token, repromptHash: passwordHash, passwordEnteredDate: now });
  }

  /**
   * Delete the saved session token.
   */
  async function deleteToken(): Promise<void> {
    await Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
    ]);
    await update({ token: undefined });
  }

  async function lockVault() {
    const toast = await showToast({ title: "Locking Vault...", style: Toast.Style.Animated });
    await bitwarden.lock();
    await deleteToken();
    await toast.hide();
  }

  async function logoutVault() {
    const toast = await showToast({ title: "Logging Out...", style: Toast.Style.Animated });
    await bitwarden.logout();
    await deleteToken();
    await toast.hide();
  }

  async function loadSavedSession() {
    const [token, passwordHash, passwordEnteredDate] = await Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_PASSWORD_ENTERED),
    ]);

    /* TODO:: We can't use the "reprompt" confirmations without a hash of the master password. 
    The old session needs to be invalidated so we can get that. */
    if (token != null && passwordHash == null) {
      await bitwarden.lock();
      await deleteToken();
      return;
    }

    await update({
      token,
      repromptHash: passwordHash,
      passwordEnteredDate: passwordEnteredDate === undefined ? undefined : new Date(passwordEnteredDate),
    });
  }

  async function confirmMasterPassword(password: string): Promise<boolean> {
    const hash = await hashMasterPasswordForReprompting(password);
    if (hash !== state.repromptHash) {
      return false;
    }

    const now = new Date();
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_PASSWORD_ENTERED, now.toString());
    setState({ passwordEnteredDate: now });
    return true;
  }

  function canRepromptBeSkipped(): boolean {
    const { repromptIgnoreDuration } = getPreferenceValues<Preferences>();
    if (state.passwordEnteredDate == null) {
      return false;
    }

    const skipDuration = parseInt(repromptIgnoreDuration, 10);
    const skipUntil = state.passwordEnteredDate.getTime() + skipDuration;
    return Date.now() <= skipUntil;
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
      canRepromptBeSkipped,
      confirmMasterPassword,
    }),
    [state, active, lockVault, logoutVault, canRepromptBeSkipped, confirmMasterPassword]
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
