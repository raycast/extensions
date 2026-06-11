import { spawn } from "node:child_process";
import { statSync, createReadStream } from "node:fs";
import { basename } from "node:path";

const BAR_WIDTH = 24;

export function bar(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  return `${"█".repeat(filled)}${"░".repeat(BAR_WIDTH - filled)}  ${clamped}%`;
}

export function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function sizeOf(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

// Sanitise so the remote path needs no shell quoting and has no surprises.
function remoteNameFor(localPath: string): string {
  return basename(localPath).replace(/[^A-Za-z0-9._-]+/g, "_");
}

function sshQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(err.trim() || `${cmd} exited ${code}`)),
    );
  });
}

export interface Plan {
  valid: string[];
  targets: string[];
}

export function plan(files: string[], remoteDir: string): Plan {
  const dir = remoteDir.replace(/\/+$/, "");
  const valid = files.filter(isFile);
  const targets = valid.map((p) => `${dir}/${remoteNameFor(p)}`);
  return { valid, targets };
}

export interface TransferCallbacks {
  onProgress?: (pct: number) => void;
  onStatus?: (status: string) => void;
}

export async function transfer(
  valid: string[],
  targets: string[],
  host: string,
  remoteDir: string,
  cb: TransferCallbacks = {},
): Promise<void> {
  const dir = remoteDir.replace(/\/+$/, "");
  const sizes = valid.map(sizeOf);
  const total = Math.max(
    1,
    sizes.reduce((a, b) => a + b, 0),
  );
  let doneBytes = 0;

  await run("/usr/bin/ssh", [
    "-o",
    "BatchMode=yes",
    host,
    `mkdir -p ${sshQuote(dir)}`,
  ]);

  for (let i = 0; i < valid.length; i++) {
    const local = valid[i];
    const remote = targets[i];
    cb.onStatus?.(`Uploading ${i + 1}/${valid.length}: ${basename(local)}`);

    await new Promise<void>((resolve, reject) => {
      // Stream the file through `ssh host "cat > remote"` and count bytes as they
      // are read. Stream backpressure keeps the count tracking actual transmission,
      // so we get accurate progress without scp's tty requirement.
      const child = spawn("/usr/bin/ssh", [
        "-o",
        "BatchMode=yes",
        host,
        `cat > ${sshQuote(remote)}`,
      ]);

      let err = "";
      child.stderr.on("data", (d) => (err += d.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          doneBytes += sizes[i];
          resolve();
        } else {
          reject(new Error(err.trim() || `ssh exited with code ${code}`));
        }
      });

      let fileSent = 0;
      const rs = createReadStream(local);
      rs.on("error", (e) => {
        child.stdin.destroy();
        reject(e);
      });
      rs.on("data", (chunk: string | Buffer) => {
        fileSent += chunk.length;
        cb.onProgress?.(((doneBytes + fileSent) / total) * 100);
      });
      rs.pipe(child.stdin);
    });

    cb.onProgress?.((doneBytes / total) * 100);
  }

  cb.onProgress?.(100);
}
