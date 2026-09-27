import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { strings } from "./strings";

const execFileAsync = promisify(execFile);

export const HOSTS_PATH = "/etc/hosts";

export interface WriteResult {
  /** True when the write required a one-time administrator authorization. */
  elevated: boolean;
}

export async function readHostsFile(
  filePath: string = HOSTS_PATH,
): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

/**
 * Writes `content` to the hosts file, falling back to a one-time elevated write
 * that also grants the current user write access for future writes.
 */
export async function writeHostsFile(
  content: string,
  filePath: string = HOSTS_PATH,
): Promise<WriteResult> {
  try {
    await fs.writeFile(filePath, content, "utf8");
    return { elevated: false };
  } catch (error) {
    if (!isPermissionError(error)) throw error;
    await writeHostsFileElevated(content, filePath);
    return { elevated: true };
  }
}

/**
 * Best-effort cache flush for a direct (non-elevated) write.
 *
 * The other half of the usual incantation, `killall -HUP mDNSResponder`, needs
 * root: as the current user it always fails with "No matching processes
 * belonging to you were found", which used to surface as a DNS failure toast on
 * every save. The elevated write path refreshes both as root instead.
 */
export async function flushDns(): Promise<boolean> {
  return runQuietly("/usr/bin/dscacheutil", ["-flushcache"]);
}

async function runQuietly(command: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(command, args);
    return true;
  } catch {
    return false;
  }
}

function isPermissionError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EACCES" || code === "EPERM";
}

async function writeHostsFileElevated(
  content: string,
  filePath: string,
): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hosts-manager-"));
  const tempFile = path.join(tempDir, "hosts");
  await fs.writeFile(tempFile, content, { encoding: "utf8", mode: 0o600 });

  try {
    const username = os.userInfo().username;
    const commands = [
      `/bin/cp ${shellQuote(tempFile)} ${shellQuote(filePath)}`,
      `/bin/chmod +a ${shellQuote(`${username} allow read,write`)} ${shellQuote(filePath)}`,
      "{ /usr/bin/dscacheutil -flushcache >/dev/null 2>&1; /usr/bin/killall -HUP mDNSResponder >/dev/null 2>&1; true; }",
    ];
    const script = `do shell script ${JSON.stringify(commands.join(" && "))} with administrator privileges`;
    await execFileAsync("osascript", ["-e", script]);
  } catch (error) {
    if (isUserCancelled(error)) throw new Error(strings.adminCancelled);
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function isUserCancelled(error: unknown): boolean {
  const details = error as { message?: string; stderr?: string } | undefined;
  const text = `${details?.message ?? ""}\n${details?.stderr ?? ""}`;
  return text.includes("User canceled") || text.includes("(-128)");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
