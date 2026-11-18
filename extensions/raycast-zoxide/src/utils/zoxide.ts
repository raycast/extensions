import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import { pathFor } from "@utils/path-helpers";

// Every zoxide call runs the binary directly (no shell), so args need no escaping;
// PATH still honors the additional path directories preference. execFile's env
// replaces the inherited one, so spread it to keep settings like _ZO_DATA_DIR.
const asyncExecFile = promisify(execFile);
const env = { ...process.env, PATH: pathFor("zoxide") };

// Lists `score  path` lines, filtered by keywords when given (empty lists all by score).
export const queryZoxide = async (keywords: string[], signal?: AbortSignal): Promise<string> => {
  const args = keywords.length ? ["query", "-ls", "--", ...keywords] : ["query", "-ls"];
  const { stdout } = await asyncExecFile("zoxide", args, { env, signal, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
};

// Synchronous so it completes inside Action.Open's onOpen, before opening the
// target tears the command down.
export const addToZoxide = (folder: string) => {
  execFileSync("zoxide", ["add", "--", folder], { env });
};

export const removeFromZoxide = async (folder: string) => {
  await asyncExecFile("zoxide", ["remove", "--", folder], { env });
};
