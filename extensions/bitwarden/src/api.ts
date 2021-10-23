import execa from "execa";
import { VaultStatus } from "./types";

export class Bitwarden {
  private env: Record<string, string>;
  constructor(clientId: string, clientSecret: string) {
    this.env = {
      BW_CLIENTSECRET: clientSecret,
      BW_CLIENTID: clientId,
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

  async status(sessionToken: string | undefined): Promise<VaultStatus> {
    const {stdout} = await this.exec(sessionToken ? ["status", "--session", sessionToken]: ["status"]);
    return JSON.parse(stdout).status
  }

  private async exec(args: string[]): Promise<execa.ExecaChildProcess> {
    return await execa("bw", args, { env: this.env });
  }
}
