import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { execa, ExecaChildProcess } from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { CLINotFoundError } from "~/components/RootErrorBoundary";
import { LOCAL_STORAGE_KEY, DEFAULT_SERVER_URL } from "~/constants/general";
import { Preferences, VaultState } from "~/types/general";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { Item } from "~/types/vault";
import { getPasswordGeneratingArgs } from "~/utils/passwords";
import { getServerUrlPreference } from "~/utils/preferences";

export class Bitwarden {
  private env: Record<string, string>;
  private initPromise: Promise<void>;
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
    };

    if (serverUrl && serverCertsPath) {
      this.env["NODE_EXTRA_CA_CERTS"] = serverCertsPath;
    }

    // Check the CLI has been configured to use the preference Url
    this.initPromise = this.checkServerUrl(serverUrl);
  }

  async initialize() {
    await this.initPromise;
    return this;
  }

  async checkServerUrl(serverUrl: string): Promise<void> {
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
        await this.exec(["logout"]);
      } catch (error) {
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

  private async exec(args: string[], options: { abortController?: AbortController } = {}): Promise<ExecaChildProcess> {
    const { abortController } = options;
    return execa(this.cliPath, args, { env: this.env, input: "", signal: abortController?.signal });
  }

  async sync(sessionToken: string): Promise<void> {
    await this.exec(["sync", "--session", sessionToken]);
  }

  async login(): Promise<void> {
    await this.exec(["login", "--apikey"]);
  }

  async logout(): Promise<void> {
    await this.exec(["logout"]);
  }

  async listItems(sessionToken: string): Promise<Item[]> {
    const { stdout } = await this.exec(["list", "items", "--session", sessionToken]);
    const items = JSON.parse<Item[]>(stdout);
    // Filter out items without a name property (they are not displayed in the bitwarden app)
    return items.filter((item: Item) => !!item.name);
  }

  async listFolders(sessionToken: string): Promise<Item[]> {
    const { stdout } = await this.exec(["list", "folders", "--session", sessionToken]);
    const folders = JSON.parse<Item[]>(stdout);
    return folders;
  }

  async getTotp(id: string, sessionToken: string): Promise<string> {
    // this could return something like "Not found." but checks for totp code are done before calling this function
    const { stdout } = await this.exec(["get", "totp", "--session", sessionToken, id]);
    return stdout;
  }

  async unlock(password: string): Promise<string> {
    const { stdout: sessionToken } = await this.exec(["unlock", password, "--raw"]);
    return sessionToken;
  }

  async lock(): Promise<void> {
    await this.exec(["lock"]);
  }

  async status(sessionToken?: string): Promise<VaultState> {
    const { stdout } = await this.exec(sessionToken == null ? ["status"] : ["status", "--session", sessionToken]);
    return JSON.parse(stdout);
  }

  async generatePassword(options?: PasswordGeneratorOptions, abortController?: AbortController): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args], { abortController });
    return stdout;
  }
}
