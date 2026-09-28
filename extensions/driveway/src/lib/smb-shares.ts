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

// The timeout is required: without a TTY, smbutil can block forever on a
// password prompt that never appears.
async function view(target: string, extraFlags: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/smbutil", ["-v", "view", ...extraFlags, "-f", target], {
    timeout: SMBUTIL_TIMEOUT_MS,
  });
  return stdout;
}

// Enumeration is itself authenticated, so this throws on a bad host or
// credentials.
export async function listShares(host: string, user: string, password: string): Promise<string[]> {
  // -N authenticates from the Keychain and prompts for nothing, so a host
  // that has been connected to before never needs a password on the command
  // line, where any process running as this user could read it while smbutil
  // runs. The username is pinned either way, so this cannot silently
  // authenticate as somebody else.
  try {
    return parseShares(await view(user ? `//${user}@${host}` : `//${host}`, ["-N"]));
  } catch (error) {
    if (!password) throw error;
  }

  // No usable Keychain credential, so the password has to be supplied.
  // smbutil offers no way to pass one off the command line: `man smbutil`
  // lists only -A, -N, -G, -g, -a and -f for view, with the password inside
  // the URL. execFile at least avoids a shell, so it is never logged to
  // history or re-parsed.
  return parseShares(await view(`//${user}:${password}@${host}`));
}
