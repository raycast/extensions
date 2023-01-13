import { Action, ActionPanel, Form, LocalStorage, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { REPROMPT_PASSWORD_ENTERED_KEY, REPROMPT_HASH_KEY, REPROMPT_HASH_SALT, SESSION_KEY } from "./const";
import { createContext, Dispatch, PropsWithChildren, SetStateAction, useContext, useEffect, useState } from "react";
import { Bitwarden } from "./api";
import { useVaultMessages } from "./hooks";
import { pbkdf2 } from "crypto";
import { Preferences } from "./types";

const SessionContext = createContext<Session | null>(null);

/**
 * A Bitwarden login session.
 */
export class Session {
  private readonly setState: Dispatch<SetStateAction<SessionState>>;
  private readonly state: SessionState;
  public readonly api: Bitwarden;

  constructor(data: {
    state: SessionState;
    setState: Dispatch<SetStateAction<SessionState>>;
    api: Bitwarden;
    actions: { lock: () => Promise<void>; logout: () => Promise<void> };
  }) {
    this.setState = data.setState;
    this.state = data.state;
    this.api = data.api;

    this.lock = data.actions.lock;
    this.logout = data.actions.logout;
  }

  get active(): boolean {
    return !this.state.isLoading && this.state.isAuthenticated && !this.state.isLocked;
  }

  /**
   * The session token.
   */
  get token(): string | undefined {
    return this.state.token;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get isLocked(): boolean {
    return this.state.isLocked;
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Locks the vault.
   */
  readonly lock: () => Promise<void>;

  /**
   * Logs out of the vault.
   */
  logout: () => Promise<void>;

  async confirmMasterPassword(password: string): Promise<boolean> {
    const hash = await hashMasterPasswordForReprompting(password);
    if (hash !== this.state.repromptHash) {
      return false;
    }

    const now = new Date();
    await LocalStorage.setItem(REPROMPT_PASSWORD_ENTERED_KEY, now.toString());
    this.setState((old) => ({ ...old, passwordEnteredDate: now }));
    return true;
  }

  canRepromptBeSkipped(): boolean {
    const { repromptIgnoreDuration } = getPreferenceValues<Preferences>();
    if (this.state.passwordEnteredDate == null) {
      return false;
    }

    const skipDuration = parseInt(repromptIgnoreDuration, 10);
    const skipUntil = this.state.passwordEnteredDate.getTime() + skipDuration;
    return Date.now() <= skipUntil;
  }
}

interface SessionState {
  readonly token: string | undefined;

  readonly isLoading: boolean;
  readonly isLocked: boolean;
  readonly isAuthenticated: boolean;

  readonly repromptHash: string | undefined;
  readonly passwordEnteredDate: Date | undefined;
}

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

async function hashMasterPasswordForReprompting(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, REPROMPT_HASH_SALT, 100000, 64, "sha512", (error, hashed) => {
      if (error != null) {
        reject(error);
        return;
      }

      resolve(hashed.toString("hex"));
    });
  });
}

/**
 * Form for unlocking or logging in to the Bitwarden vault.
 */
function UnlockForm(props: { onUnlock: (token: string, hash: string) => void; session: Session }): JSX.Element {
  const { session, onUnlock } = props;
  const { api } = session;
  const [isLoading, setLoading] = useState<boolean>(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages(api);

  async function onSubmit(values: { password: string }) {
    if (values.password.length == 0) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Missing password.");
      return;
    }
    try {
      setLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait.");
      const state = await api.status();
      if (state.status == "unauthenticated") {
        try {
          await api.login();
        } catch (error) {
          showToast(
            Toast.Style.Failure,
            "Failed to unlock vault.",
            `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`
          );
          return;
        }
      }
      const sessionToken = await api.unlock(values.password);
      const passwordHash = await hashMasterPasswordForReprompting(values.password);

      toast.hide();
      onUnlock(sessionToken, passwordHash);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Invalid credentials.");
      setLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action.SubmitForm title="Unlock" onSubmit={onSubmit} shortcut={{ key: "enter", modifiers: [] }} />
          )}
        </ActionPanel>
      }
    >
      {shouldShowServer && <Form.Description title="Server URL" text={serverMessage} />}
      <Form.Description title="Vault Status" text={userMessage} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
}

/**
 * Form for confirming the master password.
 * This compares with the hashed master password.
 *
 * @param props.session The session instance.
 * @param props.description A description explaining why reprompting is required.
 * @param props.onConfirm Callback if confirmation is successful.
 */
export function RepromptForm(props: { session: Session; description: string; onConfirm: () => void }) {
  const { session, description, onConfirm } = props;

  async function onSubmit(values: { password: string }) {
    if (!(await session.confirmMasterPassword(values.password))) {
      showToast(Toast.Style.Failure, "Confirmation failed.");
      return;
    }

    onConfirm();
  }

  // Render the form.
  return (
    <Form
      navigationTitle={"Confirmation Required"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Confirm" onSubmit={onSubmit} shortcut={{ key: "enter", modifiers: [] }} />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
}
