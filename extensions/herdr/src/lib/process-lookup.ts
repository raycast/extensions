import { execFile } from "node:child_process";
import { basename } from "node:path";
import { parseHerdrClientTtys } from "./terminal-focus";

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

export async function lookupHerdrClientTtys(
  binary: string,
  sessionName: string,
  timeout: number,
  capture: Capture = execCapture,
): Promise<string[] | undefined> {
  let pids: string;
  try {
    pids = await capture("/usr/bin/pgrep", ["-x", basename(binary)], timeout);
  } catch (error) {
    return isNoProcessMatch(error) ? [] : undefined;
  }

  const pidList = pids
    .split(/\s+/)
    .filter((pid) => /^\d+$/.test(pid))
    .join(",");
  if (!pidList) return undefined;

  try {
    const output = await capture("/bin/ps", ["-p", pidList, "-o", "tty=,comm=,args="], timeout);
    return parseHerdrClientTtys(output, binary, sessionName);
  } catch {
    return undefined;
  }
}
