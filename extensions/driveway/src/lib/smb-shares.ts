import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseShares(output: string): string[] {
  const shares: string[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("-") || line.startsWith("Share") || /shares? listed/i.test(line)) continue;

    const [name, type] = line.split(/\s{2,}/);
    // Skip administrative shares (print$, IPC$, C$): always present, never wanted.
    if (name && type === "Disk" && !name.endsWith("$")) {
      shares.push(name);
    }
  }

  return shares;
}

const SMBUTIL_TIMEOUT_MS = 10_000;

// Enumeration is itself authenticated, so this throws on a bad host or
// credentials. execFile avoids shell quoting, though the password is still
// visible to `ps`. The timeout is required: without a TTY, smbutil can
// block forever on a password prompt that never appears.
export async function listShares(host: string, user: string, password: string): Promise<string[]> {
  const { stdout } = await execFileAsync("/usr/bin/smbutil", ["-v", "view", "-f", `//${user}:${password}@${host}`], {
    timeout: SMBUTIL_TIMEOUT_MS,
  });
  return parseShares(stdout);
}
