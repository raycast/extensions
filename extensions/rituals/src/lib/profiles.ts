import { LocalStorage } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Raycast runs with a minimal PATH, so tools like `docker`, `git` or `code`
// (in /usr/local/bin, /opt/homebrew/bin, …) aren't found. Run shell commands
// through the user's login shell so their PATH and profile are loaded.
const LOGIN_SHELL = process.env.SHELL || "/bin/zsh";

function runShell(command: string, timeout: number): Promise<unknown> {
  return execFileAsync(LOGIN_SHELL, ["-lc", command], { timeout });
}

const STORAGE_KEY = "profiles";

/**
 * One command, configured in a single place: what to run on activate, an
 * optional readiness check to wait for first, and the opposite command to run
 * on deactivate.
 */
export interface CommandEntry {
  /** Command run when the profile activates. */
  run: string;
  /** Optional probe polled until it succeeds before `run` (e.g. "docker info"). */
  waitFor?: string;
  /** Optional opposite command run when the profile deactivates (e.g. "docker stop my-db"). */
  stop?: string;
  /** Optional probe polled until it succeeds before `stop` runs on deactivate. */
  stopWaitFor?: string;
}

export interface Profile {
  id: string;
  name: string;
  /** Optional emoji or Raycast icon shown as the list icon. */
  icon?: string;
  /** App names as shown in Finder. Opened on activate, quit on deactivate. */
  apps: string[];
  /** Full URLs, e.g. "https://github.com". */
  urls: string[];
  /** File and folder paths to open, e.g. "~/Desktop/Projects". */
  paths?: string[];
  /** Commands, each with optional wait + stop. */
  commands: CommandEntry[];

  // ---- Browser ----
  /** App name to open this profile's URLs with, e.g. "Arc". Empty = default browser. */
  browser?: string;
  /** Chromium --profile-directory value (e.g. "Default", "Profile 1") for browser "workspaces". */
  browserProfile?: string;

  // ---- Execution options ----
  /** Open apps and URLs in parallel (commands always stay sequential). */
  fastMode?: boolean;
  /** Seconds to wait after each command step. */
  stepDelay?: number;

  /** Epoch ms of the last activation (for the "Recent" section). */
  lastUsedAt?: number;
}

const clean = (list?: unknown): string[] =>
  Array.isArray(list) ? list.map((s) => String(s).trim()).filter(Boolean) : [];

/**
 * Coerce raw stored/imported data into the current Profile shape, migrating the
 * old model (string[] commands, separate quitApps/waitFor/teardownCommands).
 */
function normalizeProfile(raw: Record<string, unknown>): Profile {
  const apps = clean(raw.apps);
  // Old "quitApps" are folded into apps, since apps now auto-quit on deactivate.
  for (const q of clean(raw.quitApps)) if (!apps.includes(q)) apps.push(q);

  let commands: CommandEntry[];
  if (Array.isArray(raw.commands) && raw.commands.every((c) => typeof c === "string")) {
    commands = (raw.commands as string[]).map((run) => ({ run: run.trim() })).filter((c) => c.run);
  } else if (Array.isArray(raw.commands)) {
    commands = (raw.commands as CommandEntry[])
      .map((c) => ({
        run: (c.run ?? "").trim(),
        waitFor: c.waitFor?.trim() || undefined,
        stop: c.stop?.trim() || undefined,
        stopWaitFor: c.stopWaitFor?.trim() || undefined,
      }))
      .filter((c) => c.run || c.stop || c.waitFor);
  } else {
    commands = [];
  }
  // Preserve legacy readiness/teardown lists as stand-alone command entries.
  for (const w of clean(raw.waitFor)) commands.push({ run: "", waitFor: w });
  for (const t of clean(raw.teardownCommands)) commands.push({ run: "", stop: t });

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === "string" ? raw.name : "Untitled",
    icon: typeof raw.icon === "string" ? raw.icon : undefined,
    apps,
    urls: clean(raw.urls),
    paths: clean(raw.paths),
    commands,
    browser: typeof raw.browser === "string" ? raw.browser : undefined,
    browserProfile: typeof raw.browserProfile === "string" ? raw.browserProfile : undefined,
    fastMode: !!raw.fastMode,
    stepDelay: typeof raw.stepDelay === "number" ? raw.stepDelay : undefined,
    lastUsedAt: typeof raw.lastUsedAt === "number" ? raw.lastUsedAt : undefined,
  };
}

/** Record that a ritual was just activated (for the "Recent" section). */
export async function touchProfile(id: string): Promise<void> {
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return;
  profile.lastUsedAt = Date.now();
  await saveProfiles(profiles);
}

export async function getProfiles(): Promise<Profile[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeProfile) : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const profiles = await getProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await saveProfiles(profiles);
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await getProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
}

export interface StepResult {
  label: string;
  ok: boolean;
  error?: string;
}

type Step =
  | { label: string; kind: "open-app"; arg: string }
  | { label: string; kind: "open-url"; arg: string }
  | { label: string; kind: "open-path"; arg: string }
  | { label: string; kind: "quit-app"; arg: string }
  | { label: string; kind: "shell"; arg: string }
  | { label: string; kind: "wait-for"; arg: string }
  | { label: string; kind: "open-urls-in"; browser: string; browserProfile?: string; urls: string[] };

const CHROMIUM_RE = /chrome|chromium|brave|edge|vivaldi|opera/i;

export function isChromiumBrowser(name: string): boolean {
  return CHROMIUM_RE.test(name);
}

/** A single launchable item, used by the Quick Open command. */
export type ItemType = "app" | "url" | "path" | "command";

const TIMEOUT_MS = 30_000;
const READINESS_TIMEOUT_MS = 60_000;
const READINESS_INTERVAL_MS = 1_500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const expandHome = (p: string) => (p.startsWith("~") ? p.replace(/^~/, homedir()) : p);

type ProgressFn = (done: number, total: number, label: string) => void;

/**
 * Activate a profile: open apps/URLs/files (parallel in fast mode), then run
 * each command in order — waiting for its readiness check first if set.
 * A failing step never stops the rest.
 */
export async function activateProfile(profile: Profile, onProgress?: ProgressFn): Promise<StepResult[]> {
  const urls = clean(profile.urls);
  const browser = profile.browser?.trim();
  const urlSteps: Step[] =
    browser && urls.length
      ? [
          {
            label: `Open ${urls.length} URL${urls.length === 1 ? "" : "s"} in ${browser}`,
            kind: "open-urls-in",
            browser,
            browserProfile: profile.browserProfile?.trim() || undefined,
            urls,
          },
        ]
      : urls.map((url): Step => ({ label: `Open ${url}`, kind: "open-url", arg: url }));

  const openSteps: Step[] = [
    ...clean(profile.apps).map((app): Step => ({ label: `Open ${app}`, kind: "open-app", arg: app })),
    ...urlSteps,
    ...clean(profile.paths).map((path): Step => ({ label: `Open ${path}`, kind: "open-path", arg: path })),
  ];

  // Each command may have a wait-for that runs immediately before it.
  const commandSteps: Step[] = [];
  for (const entry of profile.commands) {
    const wait = entry.waitFor?.trim();
    const run = entry.run?.trim();
    if (wait) commandSteps.push({ label: `Wait for: ${wait}`, kind: "wait-for", arg: wait });
    if (run) commandSteps.push({ label: run, kind: "shell", arg: run });
  }

  const total = openSteps.length + commandSteps.length;
  const results: StepResult[] = [];
  let done = 0;
  const report = (label: string) => onProgress?.(done, total, label);

  if (profile.fastMode) {
    report(`Opening ${openSteps.length} items…`);
    const settled = await Promise.allSettled(openSteps.map((s) => runStep(s)));
    settled.forEach((r, i) => results.push(toResult(openSteps[i], r)));
    done += openSteps.length;
  } else {
    for (const step of openSteps) {
      report(step.label);
      results.push(await runSequential(step));
      done++;
    }
  }

  const delayMs = Math.max(0, profile.stepDelay ?? 0) * 1000;
  for (const step of commandSteps) {
    report(step.label);
    results.push(await runSequential(step));
    done++;
    if (delayMs && step.kind === "shell") await sleep(delayMs);
  }

  onProgress?.(total, total, "Done");
  return results;
}

/**
 * Deactivate: run each command's stop (reverse order, waiting first if set), THEN
 * quit every app the profile opens. Stops run before quitting so e.g. containers
 * are stopped while Docker is still up, and Docker quits afterwards.
 */
export async function deactivateProfile(profile: Profile, onProgress?: ProgressFn): Promise<StepResult[]> {
  const stopSteps: Step[] = [];
  for (const entry of [...profile.commands].reverse()) {
    const stop = entry.stop?.trim();
    if (!stop) continue;
    const wait = entry.stopWaitFor?.trim();
    if (wait) stopSteps.push({ label: `Wait for: ${wait}`, kind: "wait-for", arg: wait });
    stopSteps.push({ label: stop, kind: "shell", arg: stop });
  }

  const steps: Step[] = [
    ...stopSteps,
    ...clean(profile.apps).map((app): Step => ({ label: `Quit ${app}`, kind: "quit-app", arg: app })),
  ];

  const results: StepResult[] = [];
  for (let i = 0; i < steps.length; i++) {
    onProgress?.(i, steps.length, steps[i].label);
    results.push(await runSequential(steps[i]));
  }
  onProgress?.(steps.length, steps.length, "Done");
  return results;
}

async function runSequential(step: Step): Promise<StepResult> {
  try {
    await runStep(step);
    return { label: step.label, ok: true };
  } catch (err) {
    return { label: step.label, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function toResult(step: Step, settled: PromiseSettledResult<unknown>): StepResult {
  return settled.status === "fulfilled"
    ? { label: step.label, ok: true }
    : { label: step.label, ok: false, error: String(settled.reason) };
}

function runStep(step: Step): Promise<unknown> {
  switch (step.kind) {
    case "open-app":
      return execFileAsync("open", ["-a", step.arg], { timeout: TIMEOUT_MS });
    case "open-url":
      return execFileAsync("open", [step.arg], { timeout: TIMEOUT_MS });
    case "open-path":
      return execFileAsync("open", [expandHome(step.arg)], { timeout: TIMEOUT_MS });
    case "quit-app":
      return execFileAsync("osascript", ["-e", `quit app "${step.arg.replace(/"/g, '\\"')}"`], { timeout: TIMEOUT_MS });
    case "shell":
      return runShell(step.arg, TIMEOUT_MS);
    case "wait-for":
      return waitForReady(step.arg);
    case "open-urls-in":
      return openUrlsIn(step.browser, step.browserProfile, step.urls);
  }
}

/** Open multiple URLs in a specific browser (and Chromium profile), grouped in one window. */
function openUrlsIn(browser: string, browserProfile: string | undefined, urls: string[]): Promise<unknown> {
  if (browserProfile && isChromiumBrowser(browser)) {
    // -na launches a fresh instance so --args reach the browser reliably.
    return execFileAsync("open", ["-na", browser, "--args", `--profile-directory=${browserProfile}`, ...urls], {
      timeout: TIMEOUT_MS,
    });
  }
  // `open -a <browser> <url...>` opens every URL as tabs in that browser.
  return execFileAsync("open", ["-a", browser, ...urls], { timeout: TIMEOUT_MS });
}

/** Poll a probe command until it exits 0, or throw after a timeout. */
async function waitForReady(probe: string): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      await runShell(probe, 10_000);
      return;
    } catch {
      if (Date.now() - start > READINESS_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for: ${probe}`);
      }
      await sleep(READINESS_INTERVAL_MS);
    }
  }
}

export function countActions(profile: Profile): number {
  return (
    clean(profile.apps).length +
    clean(profile.urls).length +
    clean(profile.paths).length +
    profile.commands.filter((c) => c.run?.trim()).length
  );
}

export function countTeardown(profile: Profile): number {
  return clean(profile.apps).length + profile.commands.filter((c) => c.stop?.trim()).length;
}

/** Run a single item (used by Quick Open). */
export function runOne(type: ItemType, value: string): Promise<unknown> {
  switch (type) {
    case "app":
      return runStep({ label: value, kind: "open-app", arg: value });
    case "url":
      return runStep({ label: value, kind: "open-url", arg: value });
    case "path":
      return runStep({ label: value, kind: "open-path", arg: value });
    case "command":
      return runStep({ label: value, kind: "shell", arg: value });
  }
}

/**
 * Import profiles from a JSON string. Imported profiles always get fresh ids so
 * they never clobber existing ones. Returns the number imported.
 */
export async function importProfiles(json: string, mode: "merge" | "replace"): Promise<number> {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of profiles.");

  const imported: Profile[] = parsed.map((p) => {
    if (!p || typeof p.name !== "string") throw new Error("Each profile needs a name.");
    return { ...normalizeProfile(p), id: crypto.randomUUID() };
  });

  const existing = mode === "merge" ? await getProfiles() : [];
  await saveProfiles([...existing, ...imported]);
  return imported.length;
}

/**
 * Merge the items of AI-generated rituals (JSON array) into an existing ritual.
 * Apps/URLs/paths are de-duplicated; commands are appended (by unique `run`).
 * Returns the target ritual's name.
 */
export async function mergeIntoProfile(targetId: string, json: string): Promise<string> {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of rituals.");
  const additions = parsed.map(normalizeProfile);

  const profiles = await getProfiles();
  const target = profiles.find((p) => p.id === targetId);
  if (!target) throw new Error("Target ritual not found.");

  const mergeUnique = (into: string[], from: string[]) => {
    const seen = new Set(into.map((s) => s.trim()));
    for (const x of from) {
      const t = x.trim();
      if (t && !seen.has(t)) {
        into.push(t);
        seen.add(t);
      }
    }
    return into;
  };

  target.paths = target.paths ?? [];
  const runs = new Set(target.commands.map((c) => c.run.trim()).filter(Boolean));
  for (const add of additions) {
    target.apps = mergeUnique(target.apps, add.apps);
    target.urls = mergeUnique(target.urls, add.urls);
    target.paths = mergeUnique(target.paths, add.paths ?? []);
    for (const c of add.commands) {
      if (!c.run.trim() || !runs.has(c.run.trim())) {
        target.commands.push(c);
        if (c.run.trim()) runs.add(c.run.trim());
      }
    }
    if (!target.browser && add.browser) {
      target.browser = add.browser;
      target.browserProfile = add.browserProfile;
    }
  }

  await saveProfiles(profiles);
  return target.name;
}
