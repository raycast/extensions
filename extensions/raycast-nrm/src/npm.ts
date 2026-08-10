import { execa } from "execa";
import { shellEnv, EnvironmentVariables } from "shell-env";
import { USER_HOME } from "./constants";

export class NpmExec {
  env: EnvironmentVariables | null = null;

  async exec(...args: string[]): Promise<string | null> {
    if (!this.env) {
      this.env = await shellEnv();
    }

    const { env } = this;
    const childProcess = await execa("npm", args, {
      cwd: USER_HOME,
      env,
    });

    const { stdout, stderr } = await childProcess;

    if (stderr) {
      throw stderr;
    }

    return stdout || null;
  }
}

export default new NpmExec();
