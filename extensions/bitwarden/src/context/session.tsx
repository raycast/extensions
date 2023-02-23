import { LocalStorage, showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { Session } from "~/api/session";
import UnlockForm from "~/components/UnlockForm";
import { SESSION_KEY } from "~/constants";
import { REPROMPT_HASH_KEY, REPROMPT_PASSWORD_ENTERED_KEY } from "~/constants/passwords";
import { SessionState } from "~/types/session";

export const SessionContext = createContext<Session | null>(null);

/**
 * Component which provides a session via the {@link useSession} hook.
 *
 * @param props.api The Bitwarden API.
 * @param props.unlock If true, an unlock form will be displayed if the vault is locked or unauthenticated.
 */
export function SessionProvider(props: PropsWithChildren<{ api: Bitwarden; unlock?: boolean }>): JSX.Element {
  const { api, children } = props;
  const [state, setState] = useState<SessionState>({
    token: undefined,
    isLoading: true,
    isLocked: false,
    isAuthenticated: false,

    repromptHash: undefined,
    passwordEnteredDate: undefined,
  });

  // Internal functions.

  /**
   * Determines the current status of the session.
   *
   * This is done by trying to get the list of items and seeing how the command responds to that.
   * Note: Cannot use `bw status` due to a bug.
   *
   * @see https://github.com/bitwarden/clients/issues/2729
   * @see https://github.com/raycast/extensions/pull/3413#discussion_r1014624155
   */
  async function getSessionStatus(
    api: Bitwarden,
    token: string | undefined
  ): Promise<"unlocked" | "locked" | "unauthenticated"> {
    if (token == null) {
      return "unauthenticated";
    }

    try {
      await api.listItems(token ?? "");
      return "unlocked";
    } catch (ex) {
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
    if ("token" in newState) {
      const status = await getSessionStatus(api, newState.token);

      newState = {
        ...newState,
        isLoading: false,
        isLocked: status === "locked" || status === "unauthenticated",
        isAuthenticated: status !== "unauthenticated",
      };
    }

    setState((old) => ({
      ...old,
      ...newState,
    }));
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
      LocalStorage.setItem(SESSION_KEY, token),
      LocalStorage.setItem(REPROMPT_HASH_KEY, passwordHash),
      LocalStorage.setItem(REPROMPT_PASSWORD_ENTERED_KEY, now.toString()),
    ]);

    await update({ token, repromptHash: passwordHash, passwordEnteredDate: now });
  }

  /**
   * Delete the saved session token.
   */
  async function deleteToken(): Promise<void> {
    await Promise.all([LocalStorage.removeItem(SESSION_KEY), LocalStorage.removeItem(REPROMPT_HASH_KEY)]);
    await update({ token: undefined });
  }

  // Functions provided to the Session object as actions.
  //
  // These require updating the SessionProvider's state, and must indirectly have access to setState.
  // As such, they are created here and provided to the Session object in its constructor.

  async function lockVault() {
    const toast = await showToast({ title: "Locking Vault...", style: Toast.Style.Animated });
    await api.lock();
    await deleteToken();
    await toast.hide();
  }

  async function logoutVault() {
    const toast = await showToast({ title: "Logging Out...", style: Toast.Style.Animated });
    await api.logout();
    await deleteToken();
    await toast.hide();
  }

  // Load the saved session token from LocalStorage.
  useEffect(() => {
    (async () => {
      const [token, passwordHash, passwordEnteredDate] = await Promise.all([
        LocalStorage.getItem<string>(SESSION_KEY),
        LocalStorage.getItem<string>(REPROMPT_HASH_KEY),
        LocalStorage.getItem<string>(REPROMPT_PASSWORD_ENTERED_KEY),
      ]);

      // UPGRADE: We can't use the "reprompt" confirmations without a hash of the master password.
      //          The old session needs to be invalidated so we can get that.
      if (token != null && passwordHash == null) {
        await api.lock();
        await deleteToken();
        return;
      }

      await update({
        token,
        repromptHash: passwordHash,
        passwordEnteredDate: passwordEnteredDate === undefined ? undefined : new Date(passwordEnteredDate),
      });
    })();
  }, [api]);

  // Create the Session object that will be provided to downstream components.
  // This provides an API view over the internal state of the provider.
  const session = new Session({
    setState,
    state,
    api,
    actions: {
      lock: lockVault,
      logout: logoutVault,
    },
  });

  // Return the provider.
  const needsUnlockForm = !state.isLoading && (state.isLocked || !state.isAuthenticated);
  return (
    <SessionContext.Provider value={session}>
      {needsUnlockForm && props.unlock ? <UnlockForm session={session} onUnlock={setToken} /> : children}
    </SessionContext.Provider>
  );
}

/**
 * React hook for accessing the Bitwarden login session.
 */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session == null) {
    throw new Error("useSession without SessionProvider in tree");
  }

  return session;
}
