import { execFile, spawn } from "child_process";
import { mkdirSync, openSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";

const LOCK_FILE_NAME = "cli-install.lock";
// The lock file is passed as the 4th stdio entry, which the child sees as fd 3. Keep this in
// step with `acquireBrewLock` and `runProcessWithLifetime`.
const LOCK_FILE_DESCRIPTOR = 3;
const LOCKF_PATH = "/usr/bin/lockf";
const BASH_PATH = "/bin/bash";

// Keep the lock owner outside the command's private process group. A TERM sent
// to the command group must not release the lock before the KILL escalation is
// complete. The inherited fd also lets this supervisor outlive Raycast.
const BREW_LOCK_SUPERVISOR_SCRIPT = String.raw`set -m
supervisor_pid=$$
parent_gone=0
cleanup_started=0
child_pid=
watcher_pid=

process_group_exists() {
  [ -n "$child_pid" ] && kill -0 -- -"$child_pid" 2>/dev/null
}

wait_for_process_group() {
  attempts=0
  while process_group_exists && [ "$attempts" -lt 20 ]; do
    /bin/sleep 0.1
    attempts=$((attempts + 1))
  done
}

terminate_child_group() {
  if [ "$cleanup_started" -ne 0 ] || [ -z "$child_pid" ]; then
    return 0
  fi
  cleanup_started=1
  if ! process_group_exists; then
    return 0
  fi
  kill -TERM -- -"$child_pid" 2>/dev/null || true
  wait_for_process_group
  if process_group_exists; then
    kill -KILL -- -"$child_pid" 2>/dev/null || true
    wait_for_process_group
  fi
}

lifeline_lost() {
  parent_gone=1
  terminate_child_group
}

watch_parent() {
  # USR2 is the normal-completion handshake from the supervisor. EOF means
  # Raycast went away, so the command group must be torn down first.
  trap 'exit 2' USR2
  while IFS= read -r line; do :; done
  kill -USR1 "$supervisor_pid" 2>/dev/null || true
  exit 1
}

trap 'lifeline_lost' USR1
watch_parent </dev/stdin >/dev/null 2>&1 &
watcher_pid=$!
set +m

${LOCKF_PATH} -s -t 0 ${LOCK_FILE_DESCRIPTOR}
lock_status=$?
if [ "$lock_status" -ne 0 ]; then
  kill "$watcher_pid" 2>/dev/null || true
  wait "$watcher_pid" 2>/dev/null || true
  exit "$lock_status"
fi

# set -m gives the command its own process group, so teardown can signal the whole group.
set -m
"$@" </dev/null &
child_pid=$!
set +m

if [ "$parent_gone" -ne 0 ]; then
  terminate_child_group
fi

wait "$child_pid"
status=$?
if [ "$parent_gone" -ne 0 ] && [ "$status" -eq 158 ]; then
  # 158 is 128 + SIGUSR1 (30 on macOS).
  # USR1 interrupts Bash's wait even though the trap has already started the
  # teardown. Reap the command after the private group is quiescent.
  wait "$child_pid"
  status=$?
fi

# A command can exit while leaving a descendant in its job group. Check the
# group before releasing fd3, and clean it up within the same bounded window.
terminate_child_group
kill -USR2 "$watcher_pid" 2>/dev/null || true
wait "$watcher_pid" 2>/dev/null || true
exit "$status"`;

function lockFilePath(): string {
  mkdirSync(environment.supportPath, { recursive: true });
  return join(environment.supportPath, LOCK_FILE_NAME);
}

export function brewLockCommand(file: string, args: string[], timeoutSeconds = 0) {
  const lockPath = lockFilePath();
  // Keep one inode across launches. The OS releases the lock when the process exits.
  return {
    file: LOCKF_PATH,
    args: ["-k", "-s", "-t", String(timeoutSeconds), lockPath, file, ...args],
  };
}

export function openBrewLock(): number {
  return openSync(lockFilePath(), "a+", 0o600);
}

// lockf locks the descriptor and exits at once. The lock lasts until the caller closes it.
export async function acquireBrewLock(lockFileDescriptor: number): Promise<void> {
  const lock = spawn(LOCKF_PATH, ["-s", "-t", "0", String(LOCK_FILE_DESCRIPTOR)], {
    stdio: ["ignore", "ignore", "ignore", lockFileDescriptor],
  });
  return new Promise((resolve, reject) => {
    lock.once("error", reject);
    lock.once("close", (exitCode, signal) => {
      if (exitCode === 0) resolve();
      else {
        const error = new Error(
          signal ? `lockf terminated by ${signal}` : `lockf exited with code ${exitCode}`,
        ) as Error & {
          code?: number | string;
        };
        error.code = exitCode ?? signal ?? "UNKNOWN";
        reject(error);
      }
    });
  });
}

export function brewLockSupervisorCommand(file: string, args: string[]) {
  lockFilePath();
  return {
    file: BASH_PATH,
    args: ["-c", BREW_LOCK_SUPERVISOR_SCRIPT, "pods-control-brew-supervisor", file, ...args],
  };
}

export async function isBrewOperationRunning(): Promise<boolean> {
  // Status probes briefly hold the same lock. Allow overlapping probes to
  // finish before treating contention as an installation in progress.
  const command = brewLockCommand("/usr/bin/true", [], 1);
  return new Promise((resolve, reject) => {
    execFile(command.file, command.args, { timeout: 5000 }, (error) => {
      if (!error) resolve(false);
      // 75 is EX_TEMPFAIL: another process holds the lock.
      else if (error.code === 75) resolve(true);
      else reject(error);
    });
  });
}
