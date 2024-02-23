import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { execa, ExecaChildProcess, ExecaError, ExecaReturnValue } from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { LOCAL_STORAGE_KEY, DEFAULT_SERVER_URL } from "~/constants/general";
import { VaultState, VaultStatus } from "~/types/general";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { Folder, Item } from "~/types/vault";
import { getPasswordGeneratingArgs } from "~/utils/passwords";
import { getServerUrlPreference } from "~/utils/preferences";
import { CLINotFoundError, ManuallyThrownError, NotLoggedInError, VaultIsLockedError } from "~/utils/errors";

type Env = {
  BITWARDENCLI_APPDATA_DIR: string;
  BW_CLIENTSECRET: string;
  BW_CLIENTID: string;
  PATH: string;
  NODE_EXTRA_CA_CERTS?: string;
  BW_SESSION?: string;
};

type ActionCallbacks = {
  login?: () => MaybePromise<void>;
  logout?: () => MaybePromise<void>;
  lock?: (reason?: string) => MaybePromise<void>;
  unlock?: (password: string, sessionToken: string) => MaybePromise<void>;
};

type MaybeError<T = undefined> = { result: T; error?: undefined } | { result?: undefined; error: ManuallyThrownError };

type ExecProps = {
  abortController?: AbortController;
  skipLastActivityUpdate?: boolean;
  input?: string;
};

export class Bitwarden {
  private env: Env;
  private initPromise: Promise<void>;
  private tempSessionToken?: string;
  private callbacks: ActionCallbacks = {};
  lockReason: string | undefined;
  cliPath: string;

  constructor() {
    const { cliPath, clientId, clientSecret, serverCertsPath } = getPreferenceValues<Preferences>();
    const serverUrl = getServerUrlPreference();
    this.cliPath = cliPath || (process.arch == "arm64" ? "/opt/homebrew/bin/bw" : "/usr/local/bin/bw");

    if (!existsSync(this.cliPath)) {
      throw new CLINotFoundError(`Bitwarden CLI not found at ${this.cliPath}`);
    }

    this.env = {
      BITWARDENCLI_APPDATA_DIR: environment.supportPath,
      BW_CLIENTSECRET: clientSecret.trim(),
      BW_CLIENTID: clientId.trim(),
      PATH: dirname(process.execPath),
      ...(serverUrl && serverCertsPath ? { NODE_EXTRA_CA_CERTS: serverCertsPath } : {}),
    };

    this.initPromise = (async () => {
      await this.checkServerUrl(serverUrl);
      this.lockReason = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);
    })();
  }

  setActionCallback<TAction extends keyof ActionCallbacks>(action: TAction, callback: ActionCallbacks[TAction]): this {
    this.callbacks[action] = callback;
    return this;
  }

  setSessionToken(token: string): void {
    this.env = {
      ...this.env,
      BW_SESSION: token,
    };
  }

  clearSessionToken(): void {
    delete this.env.BW_SESSION;
  }

  withSession(token: string): this {
    this.tempSessionToken = token;
    return this;
  }

  async initialize(): Promise<this> {
    await this.initPromise;
    return this;
  }

  async checkServerUrl(serverUrl: string): Promise<void> {
    // Check the CLI has been configured to use the preference Url
    const cliServer = (await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SERVER_URL)) || "";
    if (cliServer === serverUrl) return;

    // Update the server Url
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching server...",
      message: "Bitwarden server preference changed",
    });
    try {
      try {
        await this.logout();
      } catch {
        // It doesn't matter if we weren't logged in.
      }
      // If URL is empty, set it to the default
      await this.exec(["config", "server", serverUrl || DEFAULT_SERVER_URL]);
      await LocalStorage.setItem(LOCAL_STORAGE_KEY.SERVER_URL, serverUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "Bitwarden server changed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to switch server";
      if (error instanceof Error) {
        toast.message = error.message;
      } else {
        toast.message = "Unknown error occurred";
      }
    }
  }

  private async setLockReason(reason: string) {
    this.lockReason = reason;
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON, reason);
  }

  private async clearLockReason(): Promise<void> {
    if (this.lockReason) {
      await LocalStorage.removeItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);
      this.lockReason = undefined;
    }
  }

  private async exec(args: string[], options?: ExecProps): Promise<ExecaChildProcess> {
    const { abortController, input = "", skipLastActivityUpdate = false } = options ?? {};
    let env = this.env;
    if (this.tempSessionToken) env = { ...env, BW_SESSION: this.tempSessionToken };
    const result = await execa(this.cliPath, args, { env, input, signal: abortController?.signal });

    if (!skipLastActivityUpdate) {
      await LocalStorage.setItem(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME, new Date().toISOString());
    }
    if (this.tempSessionToken) {
      this.tempSessionToken = undefined;
    }
    if (this.isPromptWaitingForMasterPassword(result)) {
      /* since we have the session token in the env, the password 
      should not be requested, unless the vault is locked */
      await this.lock();
      throw new VaultIsLockedError();
    }

    return result;
  }

  async login(): Promise<MaybeError> {
    try {
      await this.exec(["login", "--apikey"]);
      await this.clearLockReason();
      await this.callbacks.login?.();
      return { result: undefined };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async logout(): Promise<MaybeError> {
    try {
      await this.exec(["logout"]);
      await this.handlePostLogout();
      return { result: undefined };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async lock(reason?: string, shouldCheckVaultStatus?: boolean): Promise<MaybeError> {
    try {
      if (shouldCheckVaultStatus) {
        const { error, result } = await this.status();
        if (error) throw error;
        if (result.status !== "unauthenticated") return { error: new NotLoggedInError("Not logged in") };
      }

      if (reason) await this.setLockReason(reason);
      await this.exec(["lock"]);
      await this.callbacks.lock?.(reason);
      return { result: undefined };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async unlock(password: string): Promise<MaybeError<string>> {
    try {
      const { stdout: sessionToken } = await this.exec(["unlock", password, "--raw"]);
      this.setSessionToken(sessionToken);
      await this.clearLockReason();
      await this.callbacks.unlock?.(password, sessionToken);
      return { result: sessionToken };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async sync(): Promise<MaybeError> {
    try {
      await this.exec(["sync"]);
      return { result: undefined };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async listItems(): Promise<MaybeError<Item[]>> {
    try {
      const { stdout } = await this.exec(["list", "items"]);
      const items = JSON.parse<Item[]>(stdout);
      // Filter out items without a name property (they are not displayed in the bitwarden app)
      return { result: items.filter((item: Item) => !!item.name) };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async listFolders(): Promise<MaybeError<Folder[]>> {
    try {
      const { stdout } = await this.exec(["list", "folders"]);
      return { result: JSON.parse<Folder[]>(stdout) };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async createFolder(name: string): Promise<MaybeError> {
    try {
      const folder = await this.getTemplate("folder");
      folder.name = name;
      const encodedFolder = await this.encode(JSON.stringify(folder));
      await this.exec(["create", "folder", encodedFolder]);
      return { result: undefined };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async getTotp(id: string): Promise<MaybeError<string>> {
    try {
      // this could return something like "Not found." but checks for totp code are done before calling this function
      const { stdout } = await this.exec(["get", "totp", id]);
      return { result: stdout };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async status(): Promise<MaybeError<VaultState>> {
    try {
      const { stdout } = await this.exec(["status"]);
      return { result: JSON.parse<VaultState>(stdout) };
    } catch (execError) {
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async checkLockStatus(): Promise<VaultStatus> {
    try {
      await this.exec(["unlock", "--check"]);
      return "unlocked";
    } catch (error) {
      const errorMessage = (error as ExecaError).stderr;
      if (errorMessage === "Vault is locked.") return "locked";
      return "unauthenticated";
    }
  }

  async getTemplate(type: string): Promise<any> {
    const { stdout } = await this.exec(["get", "template", type]);
    const template = JSON.parse(stdout);
    return template;
  }

  async encode(input: any): Promise<string> {
    const { stdout } = await this.exec(["encode"], { input });
    return stdout;
  }

  async generatePassword(options?: PasswordGeneratorOptions, abortController?: AbortController): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args], { abortController });
    return stdout;
  }

  private isPromptWaitingForMasterPassword(result: ExecaReturnValue): boolean {
    return !!(result.stderr && result.stderr.includes("Master password"));
  }

  private async handlePostLogout() {
    this.clearSessionToken();
    await this.callbacks.logout?.();
  }

  private async handleCommonErrors(error: any): Promise<{ error?: ManuallyThrownError }> {
    const errorMessage = (error as ExecaError).stderr;
    if (!errorMessage) return {};

    if (/not logged in/i.test(errorMessage)) {
      await this.handlePostLogout();
      return { error: new NotLoggedInError("Not logged in") };
    }
    return {};
  }
}
