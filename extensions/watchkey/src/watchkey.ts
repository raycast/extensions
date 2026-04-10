import { execFile, spawn } from "node:child_process";
import { accessSync } from "node:fs";

function resolveWatchkeyPath(): string | null {
  for (const p of ["/usr/local/bin/watchkey", "/opt/homebrew/bin/watchkey"]) {
    try {
      accessSync(p);
      return p;
    } catch {
      /* continue */
    }
  }
  return null;
}

const WATCHKEY_PATH = resolveWatchkeyPath();

export function isWatchkeyInstalled(): boolean {
  return WATCHKEY_PATH !== null;
}

export async function watchkeySet(service: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(WATCHKEY_PATH!, ["set", service]);
    child.stdin.write(value);
    child.stdin.end();

    let stderr = "";
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `watchkey exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function watchkeyGet(service: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH!, ["get", service], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout.trim());
    });
  });
}

export async function watchkeyDelete(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH!, ["delete", service], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

async function listViaCli(): Promise<string[]> {
  const output = await execPromise(WATCHKEY_PATH!, ["list"]);
  return output.trim().split("\n").filter(Boolean);
}

async function listViaKeychain(): Promise<string[]> {
  const output = await execPromise("/usr/bin/security", ["dump-keychain"]);
  const services: string[] = [];
  const blocks = output.split("keychain:");

  for (const block of blocks) {
    const lines = block.split("\n");
    let svce = "";
    let isWatchkey = false;

    for (const line of lines) {
      const svceMatch = line.match(/"svce"<blob>="(.+?)"/);
      if (svceMatch) svce = svceMatch[1];

      const acctMatch = line.match(/"acct"<blob>="(.+?)"/);
      if (acctMatch && acctMatch[1] === "watchkey") isWatchkey = true;
    }

    if (isWatchkey && svce) {
      services.push(svce);
    }
  }

  return [...new Set(services)].sort();
}

export async function watchkeyList(): Promise<string[]> {
  try {
    return await listViaCli();
  } catch {
    return await listViaKeychain();
  }
}

const WATCHKEY_REPO = "Etheirystech/watchkey";

async function getInstalledVersion(): Promise<string | null> {
  try {
    const output = await execPromise(WATCHKEY_PATH!, ["--version"]);
    return output.trim();
  } catch {
    return null;
  }
}

async function getLatestVersion(): Promise<string | null> {
  try {
    const output = await execPromise("/usr/bin/curl", [
      "-s",
      "-H",
      "Accept: application/vnd.github+json",
      `https://api.github.com/repos/${WATCHKEY_REPO}/releases/latest`,
    ]);
    const match = output.match(/"tag_name"\s*:\s*"v?([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function checkForUpdate(): Promise<{ installed: string; latest: string } | null> {
  const [installed, latest] = await Promise.all([getInstalledVersion(), getLatestVersion()]);
  if (!latest) return null;
  if (!installed || installed !== latest) return { installed: installed ?? "unknown", latest };
  return null;
}

export async function watchkeyImport(service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(WATCHKEY_PATH!, ["set", service, "--import"], (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve();
    });
  });
}
