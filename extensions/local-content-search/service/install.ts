import { execFile, spawn } from "node:child_process";
import { constants } from "node:fs";
import { promisify } from "node:util";
import { arch, homedir, totalmem } from "node:os";
import { join } from "node:path";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  statfs,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { paths, Paths } from "./paths";
import { AGENT_LABEL, launchAgent } from "./agent";
import { LocalClient } from "./client";
import { downloadVerified } from "./download";
import { HELPER, HELPER_VERSION, MODELS } from "./artifacts";

const exec = promisify(execFile);
const execCommand = async (file: string, args: string[]) => {
  await exec(file, args);
};
const AGENTS = join(homedir(), "Library/LaunchAgents");
const MIN_MEMORY_BYTES = 8 * 1024 ** 3;
// Covers both models, compressed/extracted helper, activation copy, and a 2 GiB free-space reserve.
const SETUP_DISK_BYTES = 4 * 1024 ** 3;
const SERVICE_WAIT_MS = 15000;
const POLL_MS = 250;
const LAUNCHD_IO_ERROR = 5;
const EXIT_SUCCESS = 0;
const LOCK_BUSY_EXIT = 75;
const LOCK_READY = "locked\n";
// Allow a crashed parent's pipe helper a brief interval to observe EOF and release its lock.
const LOCK_WAIT_SECONDS = 1;
const LOCK_TIMEOUT_MS = 5000;
type Execute = typeof execCommand;
export type InstallProgress = (
  stage: string,
  received?: number,
  total?: number,
) => void;

// launchd -> bundled Node -> service -> native engine. No developer-tool paths survive installation.
async function stopService(run: Execute): Promise<void> {
  const target = `gui/${process.getuid!()}/${AGENT_LABEL}`;
  try {
    await run("/bin/launchctl", ["print", target]);
  } catch (error) {
    // Only a missing registration is harmless; permission and transport failures must reach the user.
    if (
      (error as { stderr?: string }).stderr?.includes("Could not find service")
    ) {
      return;
    }
    throw error;
  }
  await run("/bin/launchctl", ["bootout", target]);
}

// bootout returns before launchd removes its job; bootstrap can temporarily return EIO.
async function registerService(plist: string, run: Execute): Promise<void> {
  const deadline = Date.now() + SERVICE_WAIT_MS;
  while (true) {
    try {
      await run("/bin/launchctl", [
        "bootstrap",
        `gui/${process.getuid!()}`,
        plist,
      ]);
      return;
    } catch (error) {
      if (
        (error as { code?: number }).code !== LAUNCHD_IO_ERROR ||
        Date.now() >= deadline
      ) {
        throw error;
      }
      await new Promise((done) => {
        setTimeout(done, POLL_MS);
      });
    }
  }
}

// Stage before stopping the old service; on failure restore its binaries and registration.
export async function activateHelper(
  helper: string,
  locations: Paths,
  agents = AGENTS,
  run: Execute = execCommand,
  ready = async () => {
    await waitForService(locations);
  },
): Promise<void> {
  const stage = await mkdtemp(join(locations.base, "activate-"));
  const bin = join(locations.base, "bin");
  const backup = join(stage, "previous-bin");
  const plist = join(agents, `${AGENT_LABEL}.plist`);
  const previousPlist = await readFile(plist).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
      return undefined;
    },
  );
  let backedUp = false;
  let replaced = false;
  let activated = false;
  try {
    await mkdir(join(stage, "bin"), { mode: 0o700 });
    for (const file of ["node", "local-search-engine", "service.cjs"]) {
      await cp(join(helper, "bin", file), join(stage, "bin", file));
      await chmod(
        join(stage, "bin", file),
        file === "service.cjs" ? 0o600 : 0o755,
      );
    }
    await cp(join(helper, "licenses"), join(locations.base, "licenses"), {
      recursive: true,
    });
    await mkdir(agents, { recursive: true });
    await mkdir(locations.logs, { recursive: true, mode: 0o700 });
    await stopService(run);
    try {
      await rename(bin, backup);
      backedUp = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    await rename(join(stage, "bin"), bin);
    replaced = true;
    await writeFile(plist, launchAgent(join(bin, "node"), locations), {
      mode: 0o600,
    });
    await run("/usr/bin/plutil", ["-lint", plist]);
    await registerService(plist, run);
    await ready();
    await writeFile(join(locations.base, "installed-version"), HELPER_VERSION, {
      mode: 0o600,
    });
    await unlink(join(locations.base, "disabled")).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      },
    );
    activated = true;
  } catch (error) {
    if (replaced || backedUp) {
      await stopService(run);
      await rm(bin, { recursive: true, force: true });
      if (backedUp) {
        await rename(backup, bin);
      }
      if (previousPlist) {
        await writeFile(plist, previousPlist, { mode: 0o600 });
        await registerService(plist, run);
      } else {
        await unlink(plist).catch(() => {});
      }
    }
    throw error;
  } finally {
    // A failed rollback must not delete the only copy of the previous helper.
    const recoveryPending = await access(backup)
      .then(() => true)
      .catch(() => false);
    if (activated || !recoveryPending) {
      await rm(stage, { recursive: true, force: true });
    }
  }
}

async function waitForService(locations: Paths): Promise<void> {
  const client = new LocalClient(locations.socket);
  const deadline = Date.now() + SERVICE_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      await client.status();
      return;
    } catch {
      await new Promise((done) => {
        setTimeout(done, POLL_MS);
      });
    }
  }
  throw new Error(`Service did not become ready. See ${locations.logs}`);
}

// Parent pipe -> lockf/kernel lock -> cat acknowledgement. EOF (including parent crash) releases ownership.
// Keep the inode permanently; PID contents never determine ownership. Command mode also supports macOS 14.
async function acquireLock(locations: Paths) {
  const lock = join(locations.base, "install.lock");
  const handle = await open(lock, "a", 0o600);
  await handle.close();
  const child = spawn(
    "/usr/bin/lockf",
    ["-k", "-t", String(LOCK_WAIT_SECONDS), lock, "/bin/cat"],
    { stdio: "pipe" },
  );
  const closed = new Promise<number | null>((done) => {
    child.once("close", done);
    child.once("error", () => {
      done(null);
    });
  });
  let timer: NodeJS.Timeout | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      let output = "",
        diagnostic = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
        if (output === LOCK_READY) {
          resolve();
        }
      });
      child.stderr.on("data", (chunk: Buffer) => {
        diagnostic += chunk.toString();
      });
      child.stdin.on("error", () => {});
      child.once("error", reject);
      child.once("close", (code) => {
        reject(
          new Error(
            code === LOCK_BUSY_EXIT
              ? "Setup is already running. Keep that command open until it finishes"
              : `Could not acquire setup lock: ${diagnostic.trim() || code}`,
          ),
        );
      });
      timer = setTimeout(() => {
        reject(new Error("Setup lock acknowledgement timed out"));
      }, LOCK_TIMEOUT_MS);
      child.stdin.write(LOCK_READY);
    });
    return async () => {
      child.stdin.end();
      if ((await closed) !== EXIT_SUCCESS) {
        throw new Error("Setup lock holder exited unexpectedly");
      }
    };
  } catch (error) {
    child.stdin.destroy();
    child.kill("SIGTERM");
    await closed;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Installed-version is written only after a verified install; required files must still exist locally.
async function installedFilesReady(locations: Paths): Promise<boolean> {
  try {
    if (
      (await readFile(join(locations.base, "installed-version"), "utf8")) !==
      HELPER_VERSION
    ) {
      return false;
    }
    for (const file of [
      join(locations.base, "bin/node"),
      locations.engine,
      locations.daemon,
    ]) {
      const info = await stat(file);
      if (!info.isFile() || info.size === 0) {
        return false;
      }
    }
    for (const model of MODELS) {
      const info = await stat(join(locations.models, model.name));
      if (!info.isFile() || info.size !== model.bytes) {
        return false;
      }
    }
    await access(join(locations.base, "bin/node"), constants.X_OK);
    await access(locations.engine, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Cached files do not authorize automatic recovery after explicit removal.
async function serviceRemoved(locations: Paths): Promise<boolean> {
  return access(join(locations.base, "disabled"))
    .then(() => true)
    .catch(() => false);
}

// Restart the installed helper without fetching or rewriting models, configuration or index data.
export async function restartService(
  report: InstallProgress,
  locations = paths(),
  agents = AGENTS,
  run: Execute = execCommand,
  ready = async () => {
    await waitForService(locations);
  },
): Promise<void> {
  const releaseLock = await acquireLock(locations);
  try {
    if (await serviceRemoved(locations)) {
      throw new Error(
        "Service was explicitly removed; choose Install to enable it again",
      );
    }
    if (!(await installedFilesReady(locations))) {
      throw new Error(
        "Installed files are incomplete; choose Repair Installation while online",
      );
    }
    if (
      await new LocalClient(locations.socket)
        .status()
        .then((status) => status.modelReady)
        .catch(() => false)
    ) {
      report("Background service already running");
      return;
    }
    report("Restarting installed background service; no downloads");
    await mkdir(agents, { recursive: true });
    await mkdir(locations.logs, { recursive: true, mode: 0o700 });
    await stopService(run);
    const plist = join(agents, `${AGENT_LABEL}.plist`);
    await writeFile(
      plist,
      launchAgent(join(locations.base, "bin/node"), locations),
      { mode: 0o600 },
    );
    await run("/usr/bin/plutil", ["-lint", plist]);
    await registerService(plist, run);
    await ready();
    report("Background service restarted");
  } finally {
    await releaseLock();
  }
}

// The UI calls this once; network and launchd mechanics stay below the command layer.
export async function installService(
  report: InstallProgress,
  helperPath?: string,
  locations = paths(),
): Promise<void> {
  if (process.platform !== "darwin" || arch() !== "arm64") {
    throw new Error("Local Content Search requires an Apple Silicon Mac");
  }
  if (totalmem() < MIN_MEMORY_BYTES) {
    throw new Error("At least 8 GB memory is required");
  }
  await mkdir(locations.base, { recursive: true, mode: 0o700 });
  await chmod(locations.base, 0o700);
  const releaseLock = await acquireLock(locations);
  let stage: string | undefined;
  try {
    const disk = await statfs(locations.base);
    if (disk.bavail * disk.bsize < SETUP_DISK_BYTES) {
      throw new Error("Not enough disk space; setup needs 4 GB free");
    }
    stage = await mkdtemp(join(locations.base, "setup-"));
    await mkdir(locations.models, { recursive: true, mode: 0o700 });
    let helper = helperPath;
    if (!helper) {
      const archive = join(stage, "helper.tar.gz");
      report("Downloading helper");
      await downloadVerified(HELPER, archive, (received, total) => {
        report("Downloading helper", received, total);
      });
      report("Unpacking verified helper");
      await execCommand("/usr/bin/tar", ["-xzf", archive, "-C", stage]);
      helper = stage;
    }
    for (const model of MODELS) {
      report(`Verifying ${model.name}`);
      await downloadVerified(
        model,
        join(locations.models, model.name),
        (received, total) => {
          report(`Downloading ${model.name}`, received, total);
        },
      );
    }
    report("Starting background service");
    await activateHelper(helper, locations);
    report("Ready — choose folders in Manage Content Index");
  } finally {
    if (stage) {
      await rm(stage, { recursive: true, force: true });
    }
    await releaseLock();
  }
}

// Explicit removal leaves a marker so opening Search does not silently reinstall it.
export async function removeService(
  locations = paths(),
  agents = AGENTS,
  run: Execute = execCommand,
): Promise<void> {
  await mkdir(locations.base, { recursive: true, mode: 0o700 });
  const releaseLock = await acquireLock(locations);
  try {
    await stopService(run);
    const plist = join(agents, `${AGENT_LABEL}.plist`);
    await rename(plist, `${plist}.disabled`).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      },
    );
    await writeFile(
      join(locations.base, "disabled"),
      "Removed from Raycast setup",
      { mode: 0o600 },
    );
  } finally {
    await releaseLock();
  }
}

export async function installationState(
  locations = paths(),
): Promise<"ready" | "missing" | "disabled" | "stopped"> {
  if (await serviceRemoved(locations)) {
    return "disabled";
  }
  if (!(await installedFilesReady(locations))) {
    return "missing";
  }
  try {
    const status = await new LocalClient(locations.socket).status();
    return status.modelReady ? "ready" : "missing";
  } catch {
    // An intact installation with an unavailable socket needs a local restart, not another download.
    return "stopped";
  }
}
