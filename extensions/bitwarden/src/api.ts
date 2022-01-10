import { getPreferenceValues } from "@raycast/api";
import execa from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { VaultStatus } from "./types";

export class Bitwarden {
  private env: Record<string, string>;
  private cliPath: string;
  constructor() {
    const { cliPath, clientId, clientSecret } = getPreferenceValues();
    if (cliPath) {
      this.cliPath = cliPath;
    } else {
      this.cliPath = process.arch == "arm64" ? "/opt/homebrew/bin/bw" : "/usr/local/bin/bw";
    }
    if (!existsSync(this.cliPath)) {
      throw Error(`Invalid Cli Path: ${this.cliPath}`);
    }
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

  async listItems<ItemType>(type: string, sessionToken: string): Promise<ItemType[]> {
    const { stdout } = await this.exec(["list", type, "--session", sessionToken]);
    return JSON.parse(stdout);
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

  async status(sessionToken: string | undefined): Promise<VaultStatus> {
    const { stdout } = await this.exec(sessionToken ? ["status", "--session", sessionToken] : ["status"]);
    return JSON.parse(stdout).status;
  }

  private async exec(args: string[]): Promise<execa.ExecaChildProcess> {
    return execa(this.cliPath, args, { env: this.env });
  }
}
