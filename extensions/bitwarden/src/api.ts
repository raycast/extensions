import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import { execa, ExecaChildProcess } from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { Item, PasswordGeneratorOptions, Preferences, VaultState } from "./types";
import { getPasswordGeneratingArgs } from "./utils";

export class Bitwarden {
  private env: Record<string, string>;
  cliPath: string;
  initPromise: Promise<void>;

  constructor() {
    const { cliPath, clientId, clientSecret, serverUrl, serverCertsPath } = getPreferenceValues<Preferences>();
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

    // Check the CLI has been set to the preference
    this.initPromise = LocalStorage.getItem<string>("cliServer").then(async (cliServer) => {
      if ((cliServer || "") !== serverUrl) {
        await this.setServerUrl(serverUrl);
      }
    });
  }

  async setServerUrl(url: string): Promise<void> {
    // If URL is empty, set it to the default
    await this.exec(["config", "server", url || "https://bitwarden.com"], undefined, false);
    await LocalStorage.setItem("cliServer", url);
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
    const { stdout } = await this.exec(["generate", ...args], abortController);
    return stdout;
  }

  private async exec(
    args: string[],
    abortController?: AbortController,
    waitForInit = true
  ): Promise<ExecaChildProcess> {
    if (waitForInit) await this.initPromise;
    return execa(this.cliPath, args, { env: this.env, input: "", signal: abortController?.signal });
  }
}
