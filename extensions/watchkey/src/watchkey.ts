import { execFile, spawn } from "node:child_process";

const WATCHKEY_PATH = "/usr/local/bin/watchkey";

export async function watchkeySet(service: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(WATCHKEY_PATH, ["set", service]);
    child.stdin.write(value);
    child.stdin.end();

    let stderr = "";
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `watchkey exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function watchkeyGet(service: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["get", service], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

export async function watchkeyDelete(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["delete", service], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}

export async function watchkeyImport(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH, ["set", service, "--import"], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}
