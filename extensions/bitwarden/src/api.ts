import execa from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { Item, PasswordGeneratorOptions, VaultStatus } from "./types";
import { getPasswordGeneratingArgs } from "./utils";

export class Bitwarden {
  private env: Record<string, string>;
  cliPath: string;
  constructor(clientId: string, clientSecret: string, cliPath: string) {
    if (!cliPath) {
      cliPath = process.arch == "arm64" ? "/opt/homebrew/bin/bw" : "/usr/local/bin/bw";
    }
    if (!existsSync(cliPath)) {
      throw new Error(`Bitwarden CLI not found at ${cliPath}`);
    }
    this.cliPath = cliPath;
    this.env = {
      BW_CLIENTSECRET: clientSecret.trim(),
      BW_CLIENTID: clientId.trim(),
      PATH: dirname(process.execPath),
    };
  }

  async sync(sessionToken: string): Promise<void> {
    await this.exec(["sync", "--session", sessionToken]);
  }

  async login(): Promise<void> {
    await this.exec(["login", "--apikey"]);
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

  async status(): Promise<VaultStatus> {
    const { stdout } = await this.exec(["status"]);
    return JSON.parse(stdout).status;
  }

  async generatePassword(options?: PasswordGeneratorOptions): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args]);
    return stdout;
  }

  private async exec(args: string[]): Promise<execa.ExecaChildProcess> {
    return execa(this.cliPath, args, { env: this.env, input: "" });
  }
}
