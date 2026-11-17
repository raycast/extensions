import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, readSync, unlinkSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";

const TICK = 50;
const NAME = "scry-raycast";

export type Download = { type: "download"; label: string; done: number; total: number };
export type Progress = { type: "progress"; stage: string; done: number; total: number; walking: boolean };
type Event =
  Download | Progress | { type: "match"; path: string } | { type: "end" } | { type: "error"; message: string };

export function literal(text: string): string {
  return text.replace(/[\\.+*?()|[\]{}^$#&\-~]/g, "\\$&");
}

export function stopEarlierSearches(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/pkill", ["-U", String(userInfo().uid), "-f", `^${NAME} `], (error) => {
      if (error && error.code !== 1) reject(error);
      else resolve();
    });
  });
}

export function run(scry: string, args: string[], progress: (event: Download | Progress) => void): Promise<string[]> {
  const path = join(tmpdir(), `${NAME}-${randomUUID()}`);
  const out = openSync(path, "wx", 0o600);
  const stdout = openSync(path, "r");
  unlinkSync(path);
  return new Promise((resolve, reject) => {
    const child = spawn(scry, args, { argv0: NAME, detached: true, stdio: ["ignore", out, "pipe"] });
    closeSync(out);
    const paths: string[] = [];
    let ended = false;
    let failure: string | undefined;
    const read = lines(stdout, (line) => {
      const event = JSON.parse(line) as Event;
      if (event.type === "download" || event.type === "progress") progress(event);
      else if (event.type === "match") paths.push(event.path);
      else if (event.type === "end") ended = true;
      else if (event.type === "error") failure = event.message;
    });
    const timer = setInterval(read, TICK);
    let stderr = "";
    child.stderr!.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearInterval(timer);
      read();
      closeSync(stdout);
      if (ended) {
        resolve(paths);
      } else if (failure !== undefined) {
        reject(new Error(failure));
      } else if (stderr.includes("unexpected argument '--json'")) {
        reject(new Error("Update scry to 0.6.0 or newer"));
      } else {
        reject(new Error(stderr.trim() || `scry exited with ${code ?? signal}`));
      }
    });
  });
}

function lines(fd: number, line: (text: string) => void): () => void {
  const buffer = Buffer.alloc(64 * 1024);
  const decoder = new StringDecoder("utf8");
  let rest = "";
  return () => {
    let n;
    while ((n = readSync(fd, buffer)) > 0) rest += decoder.write(buffer.subarray(0, n));
    const whole = rest.split("\n");
    rest = whole.pop()!;
    whole.forEach(line);
  };
}
