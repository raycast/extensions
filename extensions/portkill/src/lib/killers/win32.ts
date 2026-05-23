import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ProcessKillerError } from "./unix";

const execFileAsync = promisify(execFile);

export async function killProcessWindows(pid: number): Promise<void> {
  if (pid <= 0) {
    return;
  }

  await runTaskkill(pid, false);
  await sleep(450);

  if (await processExistsWindows(pid)) {
    await runTaskkill(pid, true);
  }
}

export async function killProcessesWindows(pids: Iterable<number>): Promise<void> {
  const sorted = [...new Set(pids)].filter((value) => value > 0).sort((a, b) => a - b);
  for (const pid of sorted) {
    await killProcessWindows(pid);
  }
}

async function runTaskkill(pid: number, force: boolean): Promise<void> {
  const args = force ? ["/F", "/PID", String(pid)] : ["/PID", String(pid)];

  try {
    await execFileAsync("taskkill", args, { windowsHide: true });
  } catch (error) {
    // taskkill's stdout/stderr is localized on non-English Windows installs,
    // so we cannot rely on substring matching. Instead, we verify the process
    // is actually gone and treat it as a successful kill if so.
    if (!(await processExistsWindows(pid))) {
      return;
    }

    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const detail = (err.stderr ?? err.stdout ?? "").trim();
    throw new ProcessKillerError(pid, detail.length > 0 ? detail : err.message || "taskkill failed");
  }
}

async function processExistsWindows(pid: number): Promise<boolean> {
  try {
    // `/FO CSV /NH` always emits a row per matching process as `"name","pid",…`
    // when the process exists, regardless of system locale. An empty / "INFO:"
    // body means it does not.
    const { stdout } = await execFileAsync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      windowsHide: true,
    });
    return new RegExp(`"${pid}"`).test(stdout);
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
