import { execFile } from "child_process";

const SERVICE = "unikey-master";
const ACCOUNT = "master";

function run(bin: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = execFile(bin, args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || String(err)));
      else resolve(stdout);
    });
    if (input !== undefined) {
      p.stdin?.end(input);
    }
  });
}

/**
 * Master password storage in the macOS Keychain via `security`.
 * Generic-password items are user-approved on first access and then
 * trusted for this app — no plaintext ever hits disk outside the Keychain.
 */
export async function keychainSave(password: string): Promise<void> {
  // -U updates the item if it exists
  await run("/usr/bin/security", [
    "add-generic-password",
    "-s", SERVICE,
    "-a", ACCOUNT,
    "-l", "UniKey Master Password",
    "-w", password,
    "-U",
  ]);
}

export async function keychainLoad(): Promise<string | null> {
  try {
    const out = await run("/usr/bin/security", [
      "find-generic-password",
      "-s", SERVICE,
      "-a", ACCOUNT,
      "-w",
    ]);
    return out.trim();
  } catch {
    return null;
  }
}

export async function keychainDelete(): Promise<void> {
  try {
    await run("/usr/bin/security", ["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT]);
  } catch {
    // already gone — fine
  }
}
