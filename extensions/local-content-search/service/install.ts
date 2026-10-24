import { execFile } from "node:child_process";
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

// Exclusive ownership prevents two Raycast commands from replacing the helper simultaneously.
async function acquireLock(locations: Paths) {
  const lock = join(locations.base, "install.lock");
  try {
    const owner = Number(await readFile(lock, "utf8"));
    if (!Number.isInteger(owner) || owner <= 0) {
      throw new Error(
        "Setup lock is incomplete; close the other setup command and retry",
      );
    }
    try {
      process.kill(owner, 0);
      throw new Error(
        "Setup is already running. Keep that command open until it finishes",
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw error;
      }
      await unlink(lock);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const handle = await open(lock, "wx", 0o600);
  await handle.writeFile(String(process.pid));
  await handle.close();
  return async () => {
    await unlink(lock);
  };
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

export async function installationState(): Promise<
  "ready" | "missing" | "disabled"
> {
  const locations = paths();
  if (
    await access(join(locations.base, "disabled"))
      .then(() => true)
      .catch(() => false)
  ) {
    return "disabled";
  }
  const version = await readFile(
    join(locations.base, "installed-version"),
    "utf8",
  ).catch(() => "");
  if (version !== HELPER_VERSION) {
    return "missing";
  }
  try {
    const status = await new LocalClient().status();
    return status.modelReady ? "ready" : "missing";
  } catch {
    return "missing";
  }
}
