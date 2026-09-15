import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import nodePath from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CodexThreadWriterLockState = "available" | "locked" | "unknown";

// Codex holds an OS file lock on this file while a session can write to the
// thread and removes it on release. Existence alone proves nothing after a
// crash, so a non-blocking shared lock attempt is the real test.
const probeScript =
  'open(my $f, "<", $ARGV[0]) or exit 2; exit(flock($f, 1 | 4) ? 0 : 1)';

export async function probeThreadWriterLock(
  codexHome: string,
  threadId: string,
): Promise<CodexThreadWriterLockState> {
  const lockPath = nodePath.join(
    codexHome,
    "thread-writer-locks",
    `${threadId}.lock`,
  );

  try {
    await access(lockPath);
  } catch {
    return "available";
  }

  try {
    await execFileAsync("/usr/bin/perl", ["-e", probeScript, lockPath], {
      timeout: 2000,
    });
    return "available";
  } catch (error) {
    return isExitCode(error, 1) ? "locked" : "unknown";
  }
}

function isExitCode(error: unknown, code: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
