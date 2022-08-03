import { Cache } from "@raycast/api";
import * as util from "util";
import { exec as execcb } from "child_process";

const exec = util.promisify(execcb);
const cache = new Cache();

export function executeCommand(cwd: string, command: string): Promise<string | null> {
  return getFromCommand(cwd, command);

  /*
  const cache = getFromCache(cwd, command);
  const cmd = getFromCommand(cwd, command);

  return Promise.any([cache, cmd]);
  */
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
      exec(command, { cwd })
        .then((r: any) => {
          const result = r.stdout.trim();
          storeInCache(cwd, command, result);
          resolve(result);
        })
        .catch((e: any) => {
          resolve(null);
        });
    }, 100);
  });
}

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
