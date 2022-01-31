import { getPreferenceValues } from "@raycast/api";
import execa from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { Item, PassphraseOptions, PasswordOptions, VaultStatus } from "./types";

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

  async generate(options: PasswordOptions | PassphraseOptions): Promise<string> {
    const args: string[] = ["generate"];
    // password options
    if ("len" in options) {
      if (options.len) {
        args.push("--length");
        args.push(options.len.toString());
      }

      if (options.numeric) {
        args.push("-n");
      }

      if (options.lowercase) {
        args.push("-l");
      }
      if (options.uppercase) {
        args.push("-u");
      }
      if (options.special) {
        args.push("-s");
      }
    } else {
      args.push("--passphrase");
      if (options.wordsLen) {
        args.push("--words");
        args.push(options.wordsLen.toString());
      }
      if (options.capitalize) {
        args.push("-c");
      }
      if (options.separator) {
        args.push("--separator");
        args.push(options.separator);
      }
      if (options.numbers) {
        args.push("--includeNumber");
      }
    }

    const { stdout: password } = await this.exec(args);
    return password;
  }

  async create(sessionToken: string, item: string): Promise<Item> {
    const { stdout: out } = await this.exec(["create", "item", item, "--session", sessionToken, "--raw"]);
    return JSON.parse(out);
  }

  private async exec(args: string[]): Promise<execa.ExecaChildProcess> {
    return execa(this.cliPath, args, { env: this.env });
  }
}
