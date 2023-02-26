import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { Preferences } from "~/types";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";
import { SessionState } from "~/types/session";
import { LOCAL_STORAGE_KEY } from "~/constants/general";

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
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_PASSWORD_ENTERED, now.toString());
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
