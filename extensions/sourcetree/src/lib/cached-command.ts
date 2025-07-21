import { Cache } from "@raycast/api";
import * as util from "util";
import { exec as execcb, execSync } from "child_process";

const exec = util.promisify(execcb);
const cache = new Cache();
let cachedSSHAuthSock: string | undefined;

export function executeCommand(cwd: string, command: string): Promise<string | null> {
  return getFromCommand(cwd, command);

  // const cache = getFromCache(cwd, command);
  // const cmd = getFromCommand(cwd, command);

  // return Promise.any([cache, cmd]);
}

function getFromCommand(cwd: string, command: string): Promise<string | null> {
  return new Promise((resolve) => {
    // if timeout is not set, the main action button
    // will only appear after the git checks is completed.

    // the desired outcome would be the main action button
    // to appear even though the git check is still running
    // since this data is only for info purposes.

    // when this timeout is set, then the button does appear
    // immediately as desired
    setTimeout(() => {
      const env = { ...process.env, PATH: getEnvPath() };

      // Setting the SSH_AUTH_SOCK environment variable may be required when using encrypted private keys
      const sshAuthSock = getSSHAuthSock();
      if (sshAuthSock) Object.assign(env, { SSH_AUTH_SOCK: sshAuthSock });

      exec(command, { cwd, env })
        .then((r) => {
          const result = r.stdout.trim();
          storeInCache(cwd, command, result);
          resolve(result);
        })
        .catch(() => {
          resolve(null);
        });
    }, 100);
  });
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function getFromCache(cwd: string, command: string): Promise<string | null> {
  const result = cache.get(`${cwd}#${command}`);

  if (result) {
    return Promise.resolve(result);
  }

  return Promise.resolve(null);
}

function storeInCache(cwd: string, command: string, result: string) {
  cache.set(`${cwd}#${command}`, result);
}

function getSSHAuthSock() {
  if (cachedSSHAuthSock !== undefined) return cachedSSHAuthSock;

  try {
    const result = execSync("launchctl getenv SSH_AUTH_SOCK", { encoding: "utf8" }).trim();
    if (result) {
      cachedSSHAuthSock = result;
      return cachedSSHAuthSock;
    }
  } catch {
    // ignore error
  }

  cachedSSHAuthSock = "";
  return "";
}

export function executeCommandSync(cwd: string, command: string) {
  const env = { ...process.env, PATH: getEnvPath() };
  return execSync(command, { cwd, env });
}

function getEnvPath() {
  // Support for Mercurial installed via Homebrew
  return [process.env.PATH, "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"].join(":");
}
