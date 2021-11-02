import { getPreferenceValues } from "@raycast/api";
import execa from "execa";
import { existsSync } from "fs";
import which from "which";
import { VaultStatus } from "./types";

const PATH = "/usr/local/bin:/opt/homebrew/bin"
export class Bitwarden {
  private env: Record<string, string>;
  private cliPath: string
  constructor() {
    const { cliPath, clientId, clientSecret } = getPreferenceValues()
    this.cliPath = cliPath ? cliPath : which.sync('bw', {path: PATH})
    if (!existsSync(this.cliPath)) {
      throw Error(`Invalid Cli Path: ${this.cliPath}`)
    }
    this.env = {
      BW_CLIENTSECRET: clientSecret,
      BW_CLIENTID: clientId,
      PATH: PATH
    };
  }

  async sync(sessionToken: string): Promise<void> {
      await this.exec(["sync", "--session", sessionToken])
  }

  async login(): Promise<void> {
     await this.exec(["login", "--apikey"]);
  }

  async listItems<ItemType>(type: string, sessionToken: string): Promise<ItemType[]> {
    const {stdout} = await this.exec(["list", type, "--session", sessionToken])
    return JSON.parse(stdout)
  }

  async unlock(password: string): Promise<string> {
      const {stdout: sessionToken} = await this.exec(["unlock", password, "--raw"])
      return sessionToken
  }

  async lock(): Promise<void> {
    await this.exec(["lock"])
  }

  async status(sessionToken: string | undefined): Promise<VaultStatus> {
    const {stdout} = await this.exec(sessionToken ? ["status", "--session", sessionToken]: ["status"]);
    return JSON.parse(stdout).status
  }

  private async exec(args: string[]): Promise<execa.ExecaChildProcess> {
    return execa(this.cliPath, args, { env: this.env });
  }
}
