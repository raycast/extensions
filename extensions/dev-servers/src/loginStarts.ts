import { LocalStorage, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  INSTALL_TIMEOUT_MS,
  SPAWN_TIMEOUT_MS,
  readPendingStarts,
  writePendingStarts,
} from "./pendingStore";
import {
  canPlanStart,
  canonicalCwd,
  directoryExists,
  missingDependencies,
  spawnLogOffset,
  startDevServer,
} from "./servers";
import { DevServer } from "./types";

const execFileAsync = promisify(execFile);

// Projects to start when the Mac starts. Kept apart from the recents list on
// purpose: recents is a bounded LRU that drops what has not run lately, and a
// project you asked to start at login must not quietly stop doing so because
// you had not opened it in a month.
export const LOGIN_KEY = "start-at-login";

// The boot the menu bar last handled, as kern.bootsessionuuid.
const BOOT_KEY = "last-handled-boot";

export interface LoginProject {
  cwd: string; // canonical path
  projectName: string;
}

// One empty list for the module, so a still-loading useLocalStorage does not
// hand every memo keyed on it a new array each render.
export const NO_LOGIN_PROJECTS: LoginProject[] = [];

export async function readLoginProjects(): Promise<LoginProject[]> {
  const raw = await LocalStorage.getItem<string>(LOGIN_KEY);
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (p): p is LoginProject =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as LoginProject).cwd === "string" &&
        typeof (p as LoginProject).projectName === "string",
    );
  } catch {
    return [];
  }
}

// Same read-change-write discipline as recents: each toggle re-reads storage
// and changes one entry, queued behind any other toggle in this command.
let writeQueue: Promise<unknown> = Promise.resolve();

// Turn starting at login on or off for one project. Returns the list as
// written, so a useLocalStorage caller can adopt it without re-reading.
export function setStartAtLogin(
  project: LoginProject,
  on: boolean,
): Promise<LoginProject[]> {
  const work = async () => {
    const cwd = canonicalCwd(project.cwd);
    const rest = (await readLoginProjects()).filter(
      (p) => canonicalCwd(p.cwd) !== cwd,
    );
    const next = on
      ? [...rest, { cwd, projectName: project.projectName }]
      : rest;
    // Record the current boot if the menu bar never has. Its first run only
    // records a boot and starts nothing, so without this, marking a project
    // before that first run would make the next restart look like a first
    // run, and the project would not start until the restart after.
    if (on && (await recordedBoot()) === undefined) {
      const boot = await bootId();
      if (boot !== null) await LocalStorage.setItem(BOOT_KEY, boot);
    }
    await LocalStorage.setItem(LOGIN_KEY, JSON.stringify(next));
    return next;
  };
  const run = writeQueue.then(work, work);
  writeQueue = run.catch(() => {});
  return run;
}

// The boot on record, if any. Only a string counts: a development build
// stored kern.boottime here as a number, and reading that as a different boot
// would start every marked project at once.
async function recordedBoot(): Promise<string | undefined> {
  const value = await LocalStorage.getItem(BOOT_KEY);
  return typeof value === "string" ? value : undefined;
}

// A UUID the kernel mints once per boot, or null when it cannot be read.
// Not kern.boottime: macOS shifts that whenever the clock is stepped (an NTP
// correction after a long sleep, a manual change), which would read as a new
// boot and start the marked projects again in the middle of the day.
async function bootId(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/sbin/sysctl",
      ["-n", "kern.bootsessionuuid"],
      { timeout: 3_000 },
    );
    const id = stdout.trim();
    return id === "" ? null : id;
  } catch {
    return null;
  }
}

// Start every project marked to start at login, once per boot. The menu bar is
// the caller because it is the one part of the extension that runs on its own:
// Raycast loads it when it launches at login and then refreshes it every
// minute in the background, so its first refresh after a restart is the
// earliest moment the extension gets to do anything. An extension cannot add
// a login item of its own, and a LaunchAgent per project would leave files
// behind outside Raycast that someone has to clean up.
//
// Each start leaves a pending row exactly like a start from the dashboard, so
// a project that fails to come up is waiting there, diagnosed, the next time
// the dashboard opens, instead of failing where nobody can see it.
//
// `running` is what the menu bar's refresh just found. A project already up
// (started from a terminal in the minute before this ran) is left alone.
export async function startLoginProjectsAfterBoot(
  running: DevServer[],
): Promise<void> {
  const boot = await bootId();
  if (boot === null) return;
  const handled = await recordedBoot();
  if (handled === boot) return;
  // Claimed before any start, so a second menu bar run that begins after this
  // write (an interval refresh landing while the user opens the menu) sees the
  // boot as handled. Two runs inside the same storage round trip could still
  // both get here; LocalStorage has no compare-and-set, so this narrows the
  // window rather than closing it, and the running check below catches a
  // second run that comes a moment later.
  await LocalStorage.setItem(BOOT_KEY, boot);
  // No boot on record means this is the first run of a version that has the
  // feature, and nobody has marked a project yet (marking one records the
  // boot): nothing to catch up on.
  if (handled === undefined) return;

  const projects = await readLoginProjects();
  if (projects.length === 0) return;
  const runningCwds = new Set(running.map((s) => canonicalCwd(s.cwd)));
  for (const project of projects) {
    const cwd = canonicalCwd(project.cwd);
    // A deleted or unmounted folder, or one with nothing to run, is skipped
    // rather than reported: Start Dev Server's Start at Login section says so
    // the next time you look.
    if (runningCwds.has(cwd) || !directoryExists(cwd) || !canPlanStart(cwd)) {
      continue;
    }
    // Nobody is there to answer "install first?" at login, and the answer
    // is implied: you asked for this project to be running.
    const install = missingDependencies(cwd) ?? undefined;
    const logStart = spawnLogOffset(cwd);
    try {
      await startDevServer(cwd, undefined, { install });
    } catch {
      // Nothing was spawned, so there is no log for a failed row to show.
      continue;
    }
    // Written after each start rather than once at the end: Raycast can end
    // a background run that goes on too long, and a start whose entry was
    // never written would fail with no trace.
    const pending = await readPendingStarts();
    pending.set(cwd, {
      name: project.projectName,
      projectKey: cwd,
      logStart,
      deadline: Date.now() + (install ? INSTALL_TIMEOUT_MS : SPAWN_TIMEOUT_MS),
      status: "starting",
      reason: null,
      kind: install ? "install" : "start",
      ignorePids: [],
    });
    await writePendingStarts(pending).catch(() => {});
  }
}

// Turn it on or off from a row's action, adopt the written list, and say what
// changed. Turning it on also says what it depends on, since the menu bar
// item is what does the starting and it can be hidden.
export async function toggleStartAtLogin(
  project: LoginProject,
  on: boolean,
  adopt: (next: LoginProject[]) => Promise<void>,
): Promise<void> {
  try {
    await adopt(await setStartAtLogin(project, on));
    await showToast({
      style: Toast.Style.Success,
      title: on
        ? `${project.projectName} will start at login`
        : `${project.projectName} won't start at login`,
      message: on
        ? "Starts after your Mac restarts, while the Dev Servers menu bar item is enabled."
        : undefined,
    });
  } catch (err) {
    await showFailureToast(err, { title: "Couldn't change Start at Login" });
  }
}
