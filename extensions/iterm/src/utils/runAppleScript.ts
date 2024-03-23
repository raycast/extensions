import child_proces from "child_process";
import { promisify } from "util";

import { ASEvalError } from "../utils";
import type { LoggerFn } from "../core";

const execFile = promisify(child_proces.execFile);

export async function runAppleScript(script: string, logger?: LoggerFn) {
  logger?.("Running AppleScript...");
  await execFile("osascript", ["-e", script, "-ss"], {
    env: {},
  })
    .catch((e) => {
      throw new ASEvalError(e);
    })
    .then(({ stdout }) => {
      if (stdout !== "") {
        throw new ASEvalError(stdout);
      }
      return { stdout };
    });

  return "";
}
