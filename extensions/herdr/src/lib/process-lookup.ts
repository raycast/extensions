import { execFile } from "node:child_process";
import { basename } from "node:path";
import { parseHerdrClientTtys, parseHerdrClients, type HerdrClient } from "./terminal-focus";

type Capture = (path: string, args: string[], timeout: number) => Promise<string>;

function execCapture(path: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(path, args, { timeout, encoding: "utf8" }, (error, stdout) =>
      error ? reject(error) : resolve(stdout.trim()),
    );
  });
}

function isNoProcessMatch(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 1;
}

// pgrep exits 1 when nothing matches, which is a confirmed empty result;
// any other failure, or output without pids, means the lookup is unavailable.
async function herdrPids(binary: string, timeout: number, capture: Capture): Promise<string[] | undefined> {
  let output: string;
  try {
    output = await capture("/usr/bin/pgrep", ["-x", basename(binary)], timeout);
  } catch (error) {
    return isNoProcessMatch(error) ? [] : undefined;
  }
  const pids = output.split(/\s+/).filter((pid) => /^\d+$/.test(pid));
  return pids.length > 0 ? pids : undefined;
}

async function listProcesses(pids: string[], columns: string, timeout: number, capture: Capture) {
  try {
    return await capture("/bin/ps", ["-p", pids.join(","), "-o", columns], timeout);
  } catch {
    return undefined;
  }
}

export async function lookupHerdrClientTtys(
  binary: string,
  sessionName: string,
  timeout: number,
  capture: Capture = execCapture,
): Promise<string[] | undefined> {
  const pids = await herdrPids(binary, timeout, capture);
  if (pids === undefined) return undefined;
  if (pids.length === 0) return [];
  const output = await listProcesses(pids, "tty=,comm=,args=", timeout, capture);
  return output === undefined ? undefined : parseHerdrClientTtys(output, binary, sessionName);
}

/** Clients of `sessionName` as pid and tty pairs, for the detach path. */
export async function lookupHerdrClients(
  binary: string,
  sessionName: string,
  timeout: number,
  capture: Capture = execCapture,
): Promise<HerdrClient[] | undefined> {
  const pids = await herdrPids(binary, timeout, capture);
  if (pids === undefined) return undefined;
  if (pids.length === 0) return [];
  const output = await listProcesses(pids, "pid=,tty=,comm=,args=", timeout, capture);
  return output === undefined ? undefined : parseHerdrClients(output, binary, sessionName);
}
