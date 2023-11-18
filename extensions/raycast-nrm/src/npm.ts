import nvexeca from "nvexeca";
import { shellEnv, EnvironmentVariables } from "shell-env";
import { USER_HOME } from "./constants";

export class NpmExec {
  env: EnvironmentVariables | null = null;

  async exec(...args: string[]): Promise<string | null> {
    if (!this.env) {
      this.env = await shellEnv();
    }

    const { env } = this;
    const { childProcess } = await nvexeca("latest", "npm", args, {
      cwd: USER_HOME,
      env,
    });

    if (childProcess) {
      const { stdout, stderr } = await childProcess;

      if (stderr) {
        throw stderr;
      }

      return stdout;
    }

    return null;
  }
}

export default new NpmExec();
