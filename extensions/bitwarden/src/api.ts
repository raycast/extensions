import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { execa, ExecaChildProcess } from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { DEFAULT_SERVER_URL } from "./const";
import { Item, PasswordGeneratorOptions, Preferences, VaultState } from "./types";
import { getPasswordGeneratingArgs, getServerUrlPreference } from "./utils";

export class Bitwarden {
  private env: Record<string, string>;
  cliPath: string;
  initPromise: Promise<void>;

  constructor() {
    const { cliPath, clientId, clientSecret, serverCertsPath } = getPreferenceValues<Preferences>();
    const serverUrl = getServerUrlPreference();
    this.cliPath = cliPath || (process.arch == "arm64" ? "/opt/homebrew/bin/bw" : "/usr/local/bin/bw");
    if (!existsSync(this.cliPath)) {
      throw new Error(`Bitwarden CLI not found at ${this.cliPath}`);
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

  async checkServerUrl(serverUrl: string): Promise<void> {
    const cliServer = (await LocalStorage.getItem<string>("cliServer")) || "";
    if (cliServer === serverUrl) {
      return;
    }
    // Update the server Url
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching server...",
      message: "Bitwarden server preference changed.",
    });
    try {
      try {
        await this.exec(["logout"], { waitForInit: false });
      } catch (error) {
        // It doesn't matter if we weren't logged in.
      }
      // If URL is empty, set it to the default
      await this.exec(["config", "server", serverUrl || DEFAULT_SERVER_URL], { waitForInit: false });
      await LocalStorage.setItem("cliServer", serverUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Bitwarden server changed.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to switch server.";
      if (error instanceof Error) {
        toast.message = error.message;
      } else {
        toast.message = "Unknown error occurred.";
      }
    }
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
    const items = JSON.parse(stdout);
    // Filter out items without a name property (they are not displayed in the bitwarden app)
    return items.filter((item: Item) => !!item.name);
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

  async status(): Promise<VaultState> {
    const { stdout } = await this.exec(["status"]);
    return JSON.parse(stdout);
  }

  async generatePassword(options?: PasswordGeneratorOptions, abortController?: AbortController): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args], { abortController });
    return stdout;
  }

  private async exec(
    args: string[],
    options: { abortController?: AbortController; waitForInit?: boolean } = {}
  ): Promise<ExecaChildProcess> {
    const { abortController, waitForInit = true } = options;
    if (waitForInit) await this.initPromise;
    return execa(this.cliPath, args, { env: this.env, input: "", signal: abortController?.signal });
  }
}
