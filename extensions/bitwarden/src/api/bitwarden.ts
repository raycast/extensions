import { Cache, environment, getPreferenceValues, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { execa, ExecaChildProcess, ExecaError, ExecaReturnValue, execaSync } from "execa";
import { existsSync, unlinkSync, writeFileSync, accessSync, constants, chmodSync } from "fs";
import { dirname } from "path/posix";
import { LOCAL_STORAGE_KEY, DEFAULT_SERVER_URL } from "~/constants/general";
import { VaultState, VaultStatus } from "~/types/general";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { Folder, Item } from "~/types/vault";
import { getPasswordGeneratingArgs } from "~/utils/passwords";
import { getServerUrlPreference } from "~/utils/preferences";
import {
  EnsureCliBinError,
  InstalledCLINotFoundError,
  ManuallyThrownError,
  NotLoggedInError,
  tryExec,
  VaultIsLockedError,
} from "~/utils/errors";
import { join } from "path";
import { chmod, rename, rm } from "fs/promises";
import { decompressFile, removeFilesThatStartWith, unlinkAllSync, waitForFileAvailable } from "~/utils/fs";
import { getFileSha256 } from "~/utils/crypto";
import { download } from "~/utils/network";
import { captureException } from "~/utils/development";

type Env = {
  BITWARDENCLI_APPDATA_DIR: string;
  BW_CLIENTSECRET: string;
  BW_CLIENTID: string;
  PATH: string;
  NODE_EXTRA_CA_CERTS?: string;
  BW_SESSION?: string;
};

type ActionListeners = {
  login?: () => MaybePromise<void>;
  logout?: (reason?: string) => MaybePromise<void>;
  lock?: (reason?: string) => MaybePromise<void>;
  unlock?: (password: string, sessionToken: string) => MaybePromise<void>;
};

type ActionListenersMap<T extends keyof ActionListeners = keyof ActionListeners> = Map<T, Set<ActionListeners[T]>>;

type MaybeError<T = undefined> = { result: T; error?: undefined } | { result?: undefined; error: ManuallyThrownError };

type ExecProps = {
  /** Reset the time of the last command that accessed data or modified the vault, used to determine if the vault timed out */
  resetVaultTimeout: boolean;
  abortController?: AbortController;
  input?: string;
};

type LockOptions = {
  /** The reason for locking the vault */
  reason?: string;
  checkVaultStatus?: boolean;
  /** The callbacks are called before the operation is finished (optimistic) */
  immediate?: boolean;
};

type LogoutOptions = {
  /** The reason for locking the vault */
  reason?: string;
  /** The callbacks are called before the operation is finished (optimistic) */
  immediate?: boolean;
};

const { supportPath } = environment;

const Δ = "2"; // changing this forces a new bin download for people that had a failed one
const BinDownloadLogger = (() => {
  /* The idea of this logger is to write a log file when the bin download fails, so that we can let the extension crash,
   but fallback to the local cli path in the next launch. This allows the error to be reported in the issues dashboard. It uses files to keep it synchronous, as it's needed in the constructor.
   Although, the plan is to discontinue this method, if there's a better way of logging errors in the issues dashboard
   or there are no crashes reported with the bin download after some time. */
  const filePath = join(supportPath, `bw-bin-download-error-${Δ}.log`);
  return {
    logError: (error: any) => tryExec(() => writeFileSync(filePath, error?.message ?? "Unexpected error")),
    clearError: () => tryExec(() => unlinkSync(filePath)),
    hasError: () => tryExec(() => existsSync(filePath), false),
  };
})();

export const cliInfo = {
  version: "2024.2.0",
  sha256: "fd80ffefd4686e677d7c8720258b3c92559b65b890519b1327cd4bb45887dde8",
  downloadPage: "https://github.com/bitwarden/clients/releases",
  path: {
    arm64: "/opt/homebrew/bin/bw",
    x64: "/usr/local/bin/bw",
    get downloadedBin() {
      return join(supportPath, cliInfo.binFilename);
    },
    get installedBin() {
      return process.arch === "arm64" ? this.arm64 : this.x64;
    },
    get bin() {
      // TODO: Remove this when the issue is resolved
      // CLI bin download is off for arm64 until bitwarden releases arm binaries
      // https://github.com/bitwarden/clients/pull/2976
      // https://github.com/bitwarden/clients/pull/7338
      if (process.arch === "arm64") {
        const cache = new Cache();
        try {
          if (!existsSync(this.downloadedBin)) throw new Error("No downloaded bin");
          if (cache.get("downloadedBinWorks") === "true") return this.downloadedBin;

          execaSync(this.downloadedBin, ["--version"]);
          cache.set("downloadedBinWorks", "true");
          return this.downloadedBin;
        } catch {
          cache.set("downloadedBinWorks", "false");
          return this.installedBin;
        }
      }

      return !BinDownloadLogger.hasError() ? this.downloadedBin : this.installedBin;
    },
  },
  get binFilename() {
    return `bw-${this.version}`;
  },
  get downloadUrl() {
    return `${this.downloadPage}/download/cli-v${this.version}/bw-macos-${this.version}.zip`;
  },
  checkHashMatchesFile: function (filePath: string) {
    return getFileSha256(filePath) === this.sha256;
  },
} as const;

export class Bitwarden {
  private env: Env;
  private initPromise: Promise<void>;
  private tempSessionToken?: string;
  private actionListeners: ActionListenersMap = new Map();
  private preferences = getPreferenceValues<Preferences>();
  private cliPath: string;
  private toastInstance: Toast | undefined;
  wasCliUpdated = false;

  constructor(toastInstance?: Toast) {
    const { cliPath: cliPathPreference, clientId, clientSecret, serverCertsPath } = this.preferences;
    const serverUrl = getServerUrlPreference();

    this.toastInstance = toastInstance;
    this.cliPath = cliPathPreference || cliInfo.path.bin;
    this.env = {
      BITWARDENCLI_APPDATA_DIR: supportPath,
      BW_CLIENTSECRET: clientSecret.trim(),
      BW_CLIENTID: clientId.trim(),
      PATH: dirname(process.execPath),
      ...(serverUrl && serverCertsPath ? { NODE_EXTRA_CA_CERTS: serverCertsPath } : {}),
    };

    this.initPromise = (async (): Promise<void> => {
      await this.ensureCliBinary();
      await this.checkServerUrl(serverUrl);
    })();
  }

  private async ensureCliBinary(): Promise<void> {
    if (this.checkCliBinIsReady(this.cliPath)) return;
    if (this.cliPath === this.preferences.cliPath || this.cliPath === cliInfo.path.installedBin) {
      throw new InstalledCLINotFoundError(`Bitwarden CLI not found at ${this.cliPath}`);
    }
    if (BinDownloadLogger.hasError()) BinDownloadLogger.clearError();

    // remove old binaries to check if it's an update and because they are 100MB+
    const hadOldBinaries = await removeFilesThatStartWith("bw-", supportPath);
    const toast = await this.showToast({
      title: `${hadOldBinaries ? "Updating" : "Initializing"} Bitwarden CLI`,
      style: Toast.Style.Animated,
      primaryAction: { title: "Open Download Page", onAction: () => open(cliInfo.downloadPage) },
    });
    const tmpFileName = "bw.zip";
    const zipPath = join(supportPath, tmpFileName);

    try {
      try {
        toast.message = "Downloading...";
        await download(cliInfo.downloadUrl, zipPath, (percent) => (toast.message = `Downloading ${percent}%`));
        if (!cliInfo.checkHashMatchesFile(zipPath)) throw new EnsureCliBinError("Binary hash does not match");
      } catch (downloadError) {
        toast.title = "Failed to download Bitwarden CLI";
        throw downloadError;
      }
      try {
        toast.message = "Extracting...";
        await decompressFile(zipPath, supportPath);
        const decompressedBinPath = join(supportPath, "bw");
        await waitForFileAvailable(decompressedBinPath);
        await rename(decompressedBinPath, this.cliPath);
        await chmod(this.cliPath, "755");
        await rm(zipPath, { force: true });
        this.wasCliUpdated = true;
      } catch (extractError) {
        toast.title = "Failed to extract Bitwarden CLI";
        throw extractError;
      }
      await toast.hide();
    } catch (error) {
      toast.message = error instanceof EnsureCliBinError ? error.message : "Please try again";
      toast.style = Toast.Style.Failure;
      unlinkAllSync(zipPath, this.cliPath);
      BinDownloadLogger.logError(error);

      if (error instanceof Error) throw new EnsureCliBinError(`${error.name}: ${error.message}`, error.stack);
      throw error;
    } finally {
      await toast.restore();
    }
  }

  private checkCliBinIsReady(filePath: string): boolean {
    try {
      if (!existsSync(this.cliPath)) return false;
      accessSync(filePath, constants.X_OK);
      return true;
    } catch {
      chmodSync(filePath, "755");
      return true;
    }
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
    const toast = await this.showToast({
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
      await this.exec(["config", "server", serverUrl || DEFAULT_SERVER_URL], { resetVaultTimeout: false });
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
    } finally {
      await toast.restore();
    }
  }

  private async exec(args: string[], options: ExecProps): Promise<ExecaChildProcess> {
    const { abortController, input = "", resetVaultTimeout } = options ?? {};

    let env = this.env;
    if (this.tempSessionToken) {
      env = { ...env, BW_SESSION: this.tempSessionToken };
      this.tempSessionToken = undefined;
    }

    const result = await execa(this.cliPath, args, { input, env, signal: abortController?.signal });

    if (this.isPromptWaitingForMasterPassword(result)) {
      /* since we have the session token in the env, the password 
      should not be requested, unless the vault is locked */
      await this.lock();
      throw new VaultIsLockedError();
    }

    if (resetVaultTimeout) {
      await LocalStorage.setItem(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME, new Date().toISOString());
    }

    return result;
  }

  async login(): Promise<MaybeError> {
    try {
      await this.exec(["login", "--apikey"], { resetVaultTimeout: true });
      await this.saveLastVaultStatus("login", "unlocked");
      await this.callActionListeners("login");
      return { result: undefined };
    } catch (execError) {
      captureException("Failed to login", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async logout(options?: LogoutOptions): Promise<MaybeError> {
    const { reason, immediate = false } = options ?? {};
    try {
      if (immediate) await this.handlePostLogout(reason);

      await this.exec(["logout"], { resetVaultTimeout: false });
      await this.saveLastVaultStatus("logout", "unauthenticated");
      if (!immediate) await this.handlePostLogout(reason);
      return { result: undefined };
    } catch (execError) {
      captureException("Failed to logout", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async lock(options?: LockOptions): Promise<MaybeError> {
    const { reason, checkVaultStatus = false, immediate = false } = options ?? {};
    try {
      if (immediate) await this.callActionListeners("lock", reason);
      if (checkVaultStatus) {
        const { error, result } = await this.status();
        if (error) throw error;
        if (result.status === "unauthenticated") return { error: new NotLoggedInError("Not logged in") };
      }

      await this.exec(["lock"], { resetVaultTimeout: false });
      await this.saveLastVaultStatus("lock", "locked");
      if (!immediate) await this.callActionListeners("lock", reason);
      return { result: undefined };
    } catch (execError) {
      captureException("Failed to lock vault", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async unlock(password: string): Promise<MaybeError<string>> {
    try {
      const { stdout: sessionToken } = await this.exec(["unlock", password, "--raw"], { resetVaultTimeout: true });
      this.setSessionToken(sessionToken);
      await this.saveLastVaultStatus("unlock", "unlocked");
      await this.callActionListeners("unlock", password, sessionToken);
      return { result: sessionToken };
    } catch (execError) {
      captureException("Failed to unlock vault", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async sync(): Promise<MaybeError> {
    try {
      await this.exec(["sync"], { resetVaultTimeout: true });
      return { result: undefined };
    } catch (execError) {
      captureException("Failed to sync vault", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async getItem(id: string): Promise<MaybeError<Item>> {
    try {
      const { stdout } = await this.exec(["get", "item", id], { resetVaultTimeout: true });
      return { result: JSON.parse<Item>(stdout) };
    } catch (execError) {
      captureException("Failed to get item", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async listItems(): Promise<MaybeError<Item[]>> {
    try {
      const { stdout } = await this.exec(["list", "items"], { resetVaultTimeout: true });
      const items = JSON.parse<Item[]>(stdout);
      // Filter out items without a name property (they are not displayed in the bitwarden app)
      return { result: items.filter((item: Item) => !!item.name) };
    } catch (execError) {
      captureException("Failed to list items", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async listFolders(): Promise<MaybeError<Folder[]>> {
    try {
      const { stdout } = await this.exec(["list", "folders"], { resetVaultTimeout: true });
      return { result: JSON.parse<Folder[]>(stdout) };
    } catch (execError) {
      captureException("Failed to list folder", execError);
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
      await this.exec(["create", "folder", encodedFolder], { resetVaultTimeout: true });
      return { result: undefined };
    } catch (execError) {
      captureException("Failed to create folder", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async getTotp(id: string): Promise<MaybeError<string>> {
    try {
      // this could return something like "Not found." but checks for totp code are done before calling this function
      const { stdout } = await this.exec(["get", "totp", id], { resetVaultTimeout: true });
      return { result: stdout };
    } catch (execError) {
      captureException("Failed to get TOTP", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async status(): Promise<MaybeError<VaultState>> {
    try {
      const { stdout } = await this.exec(["status"], { resetVaultTimeout: false });
      return { result: JSON.parse<VaultState>(stdout) };
    } catch (execError) {
      captureException("Failed to get status", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async checkLockStatus(): Promise<VaultStatus> {
    try {
      await this.exec(["unlock", "--check"], { resetVaultTimeout: false });
      await this.saveLastVaultStatus("checkLockStatus", "unlocked");
      return "unlocked";
    } catch (error) {
      captureException("Failed to check lock status", error);
      const errorMessage = (error as ExecaError).stderr;
      if (errorMessage === "Vault is locked.") {
        await this.saveLastVaultStatus("checkLockStatus", "locked");
        return "locked";
      }
      await this.saveLastVaultStatus("checkLockStatus", "unauthenticated");
      return "unauthenticated";
    }
  }

  async getTemplate(type: string): Promise<any> {
    try {
      const { stdout } = await this.exec(["get", "template", type], { resetVaultTimeout: true });
      return JSON.parse(stdout);
    } catch (execError) {
      captureException("Failed to get template", execError);
      const { error } = await this.handleCommonErrors(execError);
      if (!error) throw execError;
      return { error };
    }
  }

  async encode(input: any): Promise<string> {
    const { stdout } = await this.exec(["encode"], { input, resetVaultTimeout: false });
    return stdout;
  }

  async generatePassword(options?: PasswordGeneratorOptions, abortController?: AbortController): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args], { abortController, resetVaultTimeout: false });
    return stdout;
  }

  // utils below

  async saveLastVaultStatus(callName: string, status: VaultStatus): Promise<void> {
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_LAST_STATUS, status);
  }

  async getLastSavedVaultStatus(): Promise<VaultStatus | undefined> {
    const lastSavedStatus = await LocalStorage.getItem<VaultStatus>(LOCAL_STORAGE_KEY.VAULT_LAST_STATUS);
    if (!lastSavedStatus) {
      const vaultStatus = await this.status();
      return vaultStatus.result?.status;
    }
    return lastSavedStatus;
  }

  private isPromptWaitingForMasterPassword(result: ExecaReturnValue): boolean {
    return !!(result.stderr && result.stderr.includes("Master password"));
  }

  private async handlePostLogout(reason?: string): Promise<void> {
    this.clearSessionToken();
    await this.callActionListeners("logout", reason);
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

  setActionListener<A extends keyof ActionListeners>(action: A, listener: ActionListeners[A]): this {
    const listeners = this.actionListeners.get(action);
    if (listeners && listeners.size > 0) {
      listeners.add(listener);
    } else {
      this.actionListeners.set(action, new Set([listener]));
    }
    return this;
  }

  removeActionListener<A extends keyof ActionListeners>(action: A, listener: ActionListeners[A]): this {
    const listeners = this.actionListeners.get(action);
    if (listeners && listeners.size > 0) {
      listeners.delete(listener);
    }
    return this;
  }

  private async callActionListeners<A extends keyof ActionListeners>(
    action: A,
    ...args: Parameters<NonNullable<ActionListeners[A]>>
  ) {
    const listeners = this.actionListeners.get(action);
    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        try {
          await (listener as any)?.(...args);
        } catch (error) {
          captureException(`Error calling bitwarden action listener for ${action}`, error);
        }
      }
    }
  }

  private showToast = async (toastOpts: Toast.Options): Promise<Toast & { restore: () => Promise<void> }> => {
    if (this.toastInstance) {
      const previousStateToastOpts: Toast.Options = {
        message: this.toastInstance.message,
        title: this.toastInstance.title,
        primaryAction: this.toastInstance.primaryAction,
        secondaryAction: this.toastInstance.secondaryAction,
      };

      if (toastOpts.style) this.toastInstance.style = toastOpts.style;
      this.toastInstance.message = toastOpts.message;
      this.toastInstance.title = toastOpts.title;
      this.toastInstance.primaryAction = toastOpts.primaryAction;
      this.toastInstance.secondaryAction = toastOpts.secondaryAction;
      await this.toastInstance.show();

      return Object.assign(this.toastInstance, {
        restore: async () => {
          await this.showToast(previousStateToastOpts);
        },
      });
    } else {
      const toast = await showToast(toastOpts);
      return Object.assign(toast, { restore: () => toast.hide() });
    }
  };
}
