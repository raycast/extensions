import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, basename, join } from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { getPreferenceValues } from "@raycast/api";
import { openRpc, RpcConnection } from "./rpc";

const run = promisify(execFile);

export type ModelSelection = {
  instanceId: string;
  model: string;
  options?: { id: string; value: string | boolean | number }[];
};

export type RuntimeMode =
  "approval-required" | "auto-accept-edits" | "auto" | "full-access";

/** Where a new thread runs. T3 calls this the thread's environment. */
export type ThreadEnvMode = "local" | "worktree";

export const RUNTIME_MODES: { value: RuntimeMode; label: string }[] = [
  { value: "full-access", label: "Full access" },
  { value: "auto", label: "Auto" },
  { value: "auto-accept-edits", label: "Auto-accept edits" },
  { value: "approval-required", label: "Approval required" },
];

export type Project = {
  id: string;
  title: string;
  workspaceRoot: string;
  defaultModelSelection: ModelSelection | null;
  defaultThreadEnvMode: ThreadEnvMode | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LatestTurn = {
  turnId: string;
  state: "running" | "interrupted" | "completed" | "error";
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type Thread = {
  id: string;
  projectId: string;
  title: string;
  modelSelection: ModelSelection | null;
  runtimeMode: RuntimeMode;
  interactionMode: "default" | "plan";
  branch: string | null;
  worktreePath: string | null;
  latestTurn: LatestTurn | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  settledAt: string | null;
  snoozedUntil: string | null;
  deletedAt: string | null;
  session: {
    status: string;
    activeTurnId: string | null;
    lastError: string | null;
  } | null;
  /** Protocol v2 replaced latestTurn and session with these. */
  status?: string;
  activeRunId?: string | null;
  lastError?: string | null;
};

export type ShellSnapshot = {
  snapshotSequence: number;
  projects: Project[];
  threads: Thread[];
  updatedAt: string;
};

type EnvironmentDescriptor = {
  serverVersion?: string;
  /** Absent on servers that predate protocol v2. */
  orchestrationProtocolVersion?: number;
};

/** The server is unreachable, the token is rejected, or the request failed. Commands
 * branch on `kind` to decide whether offering "Launch T3 Code" makes sense. */
export class T3Error extends Error {
  constructor(
    readonly kind: "unreachable" | "unauthorized" | "http" | "insecure-origin",
    message: string,
  ) {
    super(message);
  }
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const RUNTIME_DIR = join(homedir(), ".t3", "userdata");
export const WORKTREES_DIR = join(homedir(), ".t3", "worktrees");

export const preferences = () => getPreferenceValues<Preferences>();

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** The token is a long-lived credential for the local T3 server, so it only ever
 * travels to loopback or over TLS. A plain-http remote origin is refused rather
 * than silently leaking the bearer to whoever is on the wire. */
function assertTokenSafeOrigin(origin: string): void {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new T3Error(
      "insecure-origin",
      `"${origin}" is not a valid server origin.`,
    );
  }
  if (url.protocol === "https:" || LOOPBACK_HOSTS.has(url.hostname)) {
    return;
  }
  throw new T3Error(
    "insecure-origin",
    `Refusing to send the access token to ${url.origin} over plain HTTP. Use https:// or a loopback address.`,
  );
}

/** A configured origin wins; otherwise the running server publishes its own port. The
 * file survives restarts with a stale port, so a failed fetch still means "not running". */
export async function resolveOrigin(): Promise<string> {
  const configured = preferences().origin?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  try {
    const raw = await readFile(
      join(RUNTIME_DIR, "server-runtime.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as {
      origin?: string;
      host?: string;
      port?: number;
    };
    if (parsed.origin) {
      return parsed.origin.replace(/\/$/, "");
    }
    if (parsed.host && parsed.port) {
      return `http://${parsed.host}:${parsed.port}`;
    }
  } catch {
    // fall through to the loopback default
  }
  return "http://127.0.0.1:3773";
}

const PROTOCOL_HEADER = "x-t3-orchestration-protocol";

const descriptors = new Map<string, Promise<EnvironmentDescriptor>>();

/** The server describes itself once per command run. Cached per origin, so a server
 * that restarts on another port or version is asked again. */
function serverDescriptor(origin: string): Promise<EnvironmentDescriptor> {
  let descriptor = descriptors.get(origin);
  if (!descriptor) {
    descriptor = request<EnvironmentDescriptor>(
      "/.well-known/t3/environment",
      undefined,
      false,
      origin,
    ).catch((error) => {
      descriptors.delete(origin);
      throw error;
    });
    descriptors.set(origin, descriptor);
  }
  return descriptor;
}

/** v2 servers reject orchestration reads without the protocol header; older servers
 * predate the field, so a missing value means v1. */
async function serverProtocolVersion(origin: string): Promise<number> {
  return (await serverDescriptor(origin)).orchestrationProtocolVersion ?? 1;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  versioned = true,
  knownOrigin?: string,
): Promise<T> {
  const origin = knownOrigin ?? (await resolveOrigin());
  assertTokenSafeOrigin(origin);
  const { token } = preferences();
  const version = versioned ? await serverProtocolVersion(origin) : 1;
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(version >= 2 ? { [PROTOCOL_HEADER]: String(version) } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new T3Error(
      "unreachable",
      `Cannot reach the T3 Code server at ${origin}.`,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new T3Error(
      "unauthorized",
      "T3 Code rejected the access token. Reissue it and update the extension preferences.",
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new T3Error(
      "http",
      `T3 Code returned ${response.status}. ${body.slice(0, 200)}`,
    );
  }
  return (await response.json()) as T;
}

/** v2 reports run state on the thread itself. Rebuild the v1 latestTurn so every
 * consumer keeps reading one shape. */
function normalizeThread(thread: Thread): Thread {
  if (thread.latestTurn !== undefined || thread.status === undefined) {
    return thread;
  }
  const state: LatestTurn["state"] | null =
    thread.activeRunId || thread.status === "running"
      ? "running"
      : thread.status === "failed" || thread.status === "error"
        ? "error"
        : thread.status === "interrupted"
          ? "interrupted"
          : null;
  return {
    ...thread,
    latestTurn: state && {
      turnId: thread.activeRunId ?? "",
      state,
      requestedAt: thread.updatedAt,
      startedAt: null,
      completedAt: null,
    },
    session: thread.lastError
      ? { status: "error", activeTurnId: null, lastError: thread.lastError }
      : null,
  };
}

export const getShell = async (): Promise<ShellSnapshot> => {
  const snapshot = await request<ShellSnapshot>("/api/orchestration/shell");
  return { ...snapshot, threads: snapshot.threads.map(normalizeThread) };
};

/** Protocol v2 creates threads over the WebSocket, v1 over HTTP dispatch. */
export const getProtocolVersion = async (): Promise<number> =>
  serverProtocolVersion(await resolveOrigin());

export const dispatch = (command: Record<string, unknown>) =>
  request<{ sequence: number }>("/api/orchestration/dispatch", {
    method: "POST",
    body: JSON.stringify(command),
  });

/** Threads the sidebar shows as active: nothing deleted, archived, settled or snoozed. */
export function activeThreads(snapshot: ShellSnapshot): Thread[] {
  return snapshot.threads.filter(
    (thread) =>
      !thread.deletedAt &&
      !thread.archivedAt &&
      !thread.settledAt &&
      !thread.snoozedUntil,
  );
}

/** Active threads whose agent has stopped, so the next move is yours. */
export function waitingThreads(snapshot: ShellSnapshot): Thread[] {
  return activeThreads(snapshot).filter(
    (thread) => thread.latestTurn?.state !== "running",
  );
}

export function liveThreads(snapshot: ShellSnapshot): Thread[] {
  return snapshot.threads.filter(
    (thread) => !thread.deletedAt && !thread.archivedAt,
  );
}

export function threadTimestamp(thread: Thread): number {
  return new Date(thread.updatedAt ?? thread.createdAt).getTime();
}

export function liveProjects(snapshot: ShellSnapshot): Project[] {
  const lastActivity = new Map<string, number>();
  for (const thread of snapshot.threads) {
    const at = threadTimestamp(thread);
    if (at > (lastActivity.get(thread.projectId) ?? 0)) {
      lastActivity.set(thread.projectId, at);
    }
  }
  return snapshot.projects
    .filter((project) => !project.deletedAt)
    .sort(
      (a, b) => (lastActivity.get(b.id) ?? 0) - (lastActivity.get(a.id) ?? 0),
    );
}

/** New sessions inherit whatever you last chose in the app for that project, so the
 * extension never carries its own model list to go stale. */
export function inheritedSettings(
  snapshot: ShellSnapshot,
  projectId: string,
  fallbackModel?: ModelSelection,
): {
  modelSelection: ModelSelection | undefined;
  runtimeMode: RuntimeMode;
  envMode: ThreadEnvMode;
} {
  const project = snapshot.projects.find(
    (candidate) => candidate.id === projectId,
  );
  const newest = snapshot.threads
    .filter(
      (thread) =>
        thread.projectId === projectId &&
        !thread.deletedAt &&
        thread.modelSelection,
    )
    .sort((a, b) => threadTimestamp(b) - threadTimestamp(a))[0];
  // No hardcoded default: a provider this machine has disabled would be rejected
  // by the server, so fall back to whatever the picker is actually offering.
  const modelSelection =
    newest?.modelSelection ?? project?.defaultModelSelection ?? fallbackModel;
  const runtimeMode = newest?.runtimeMode ?? "full-access";
  const envMode = project?.defaultThreadEnvMode ?? "local";
  return { modelSelection, runtimeMode, envMode };
}

/** Dropdown values have to be strings, so a selection round-trips through one. */
/** Options that say nothing a missing option would not: fast mode off, the default
 * service tier. Dropping them stops one model showing up several times. */
const isNoiseOption = (option: { id: string; value: unknown }) =>
  (option.id === "fastMode" && String(option.value) === "false") ||
  (option.id === "serviceTier" && option.value === "default") ||
  (option.id === "speed" && option.value === "standard") ||
  option.id === "mode";

/** Claude ids come both as "claude-fable-5-1" and "claude-fable-5.1" in old threads;
 * the dashed form is the one the manifest lists. Other providers use dots for real. */
const canonicalModel = (model: string) =>
  model.startsWith("claude-") ? model.replace(/(\d)\.(\d)/g, "$1-$2") : model;

/** Entries the server creates for its own bookkeeping, never a choice for a person. */
export const isInternalModel = (model: string) => /^<.*>$/.test(model);

const meaningfulOptions = (selection: ModelSelection) =>
  (selection.options ?? []).filter((option) => !isNoiseOption(option));

export function modelKey(selection: ModelSelection): string {
  const options = meaningfulOptions(selection)
    .map((option) => `${option.id}=${option.value}`)
    .sort()
    .join(",");
  return `${selection.instanceId}|${canonicalModel(selection.model)}|${options}`;
}

export function parseModelKey(key: string): ModelSelection {
  const [instanceId, model, options] = key.split("|");
  const parsed = (options ?? "")
    .split(",")
    .filter(Boolean)
    .map((pair) => {
      const [id, ...rest] = pair.split("=");
      return { id, value: rest.join("=") };
    });
  return parsed.length > 0
    ? { instanceId, model, options: parsed }
    : { instanceId, model };
}

type ProviderInstance = {
  driver?: string;
  displayName?: string;
  enabled?: boolean;
  config?: { customModels?: string[] };
};

type T3Settings = {
  providerInstances?: Record<string, ProviderInstance | undefined>;
  favorites?: { provider: string; model: string }[];
};

const DRIVER_NAMES: Record<string, string> = {
  claudeAgent: "Claude",
  codex: "Codex",
  antigravity: "Antigravity",
  cursor: "Cursor",
  grok: "Grok",
  opencode: "OpenCode",
};

async function readSettings(): Promise<T3Settings> {
  try {
    return JSON.parse(
      await readFile(join(RUNTIME_DIR, "settings.json"), "utf8"),
    ) as T3Settings;
  } catch {
    return {};
  }
}

/** The name T3 shows for each provider instance: the one you gave it, else its driver's. */
export async function providerNames(): Promise<Record<string, string>> {
  const { providerInstances = {} } = await readSettings();
  const names: Record<string, string> = {};
  for (const [id, instance] of Object.entries(providerInstances)) {
    names[id] =
      instance?.displayName ??
      DRIVER_NAMES[instance?.driver ?? id] ??
      instance?.driver ??
      id;
  }
  return names;
}

/** Models starred in the T3 app, so the stars here match the ones in the sidebar. They
 * match on provider and model alone, since a starred model carries no effort setting. */
export async function t3Favorites(): Promise<string[]> {
  const { favorites = [] } = await readSettings();
  return favorites.map((favorite) => `${favorite.provider}|${favorite.model}`);
}

export const isFavoriteModel = (key: string, favorites: string[]) =>
  favorites.some(
    (favorite) => key === favorite || key.startsWith(`${favorite}|`),
  );

/** "claude-opus-5-5" reads as "Opus 5.5"; other models keep their own name with the
 * dashes turned into spaces. */
export function prettyModelName(model: string): string {
  const spaced = model
    .replace(/^claude-/, "")
    .replace(/(\d)-(\d)/g, "$1.$2")
    .replace(/-/g, " ")
    .trim();
  return model.startsWith("claude-")
    ? spaced.replace(/^./, (letter) => letter.toUpperCase())
    : spaced.replace(/^gpt/i, "GPT");
}

const EFFORT_OPTION_IDS = new Set([
  "effort",
  "reasoningEffort",
  "thought_level",
]);

/** Provider, model, effort, then anything else that changes the run, each as its own
 * part. Effort always appears for providers that have one, "default" when none is set,
 * so two entries for one model never look the same. */
export function modelParts(
  selection: ModelSelection,
  names: Record<string, string> = {},
): string[] {
  const options = meaningfulOptions(selection);
  const effort = options.find((option) => EFFORT_OPTION_IDS.has(option.id));
  const hasEffort =
    effort !== undefined || /^(claudeAgent|codex)/.test(selection.instanceId);
  const extras = options
    .filter((option) => !EFFORT_OPTION_IDS.has(option.id))
    .map((option) => {
      if (option.id === "contextWindow") {
        return String(option.value).toUpperCase();
      }
      if (option.id === "fastMode") {
        return "fast";
      }
      return `${option.id} ${option.value}`;
    });
  return [
    names[selection.instanceId],
    prettyModelName(canonicalModel(selection.model)),
    hasEffort ? String(effort?.value ?? "default") : undefined,
    ...extras,
  ].filter((part): part is string => Boolean(part));
}

export const modelLabel = (
  selection: ModelSelection,
  names: Record<string, string> = {},
) => modelParts(selection, names).join(" · ");

/** Models the manifest lists for providers that are actually enabled, plus the custom
 * models an instance declares. A second instance of a driver with none of its own falls
 * back to that driver's list. Read from disk because the server publishes the manifest
 * over the WebSocket only; a missing or unreadable file just means the picker falls back
 * to what threads already use. */
async function manifestSelections(): Promise<ModelSelection[]> {
  try {
    const [manifestRaw, settings] = await Promise.all([
      readFile(join(RUNTIME_DIR, "model-manifest.json"), "utf8"),
      readSettings(),
    ]);
    const manifest = JSON.parse(manifestRaw) as {
      manifest?: { currentModels?: Record<string, string[]> };
    };
    const current = manifest.manifest?.currentModels ?? {};
    return Object.entries(settings.providerInstances ?? {})
      .filter(([, instance]) => instance?.enabled === true)
      .flatMap(([instanceId, instance]) => {
        const custom = instance?.config?.customModels ?? [];
        const listed =
          current[instanceId] ??
          (custom.length === 0 && instance?.driver
            ? current[instance.driver]
            : undefined) ??
          [];
        return [...new Set([...listed, ...custom])].map((model) => ({
          instanceId,
          model,
        }));
      });
  } catch {
    return [];
  }
}

/** Every selection worth offering: the ones this machine has actually run, most
 * recently used first, then anything else the enabled providers currently support. */
export async function modelChoices(
  snapshot: ShellSnapshot,
  names: Record<string, string> = {},
): Promise<{ key: string; label: string; selection: ModelSelection }[]> {
  const seen = new Map<string, { selection: ModelSelection; at: number }>();
  for (const thread of snapshot.threads) {
    if (
      !thread.modelSelection ||
      thread.deletedAt ||
      isInternalModel(thread.modelSelection.model)
    ) {
      continue;
    }
    const key = modelKey(thread.modelSelection);
    const at = threadTimestamp(thread);
    const previous = seen.get(key);
    if (!previous || at > previous.at) {
      seen.set(key, {
        selection: {
          ...thread.modelSelection,
          model: canonicalModel(thread.modelSelection.model),
        },
        at,
      });
    }
  }
  const used = [...seen.entries()]
    .sort((a, b) => b[1].at - a[1].at)
    .map(([key, value]) => ({
      key,
      label: modelLabel(value.selection, names),
      selection: value.selection,
    }));

  const extra = (await manifestSelections())
    .filter((selection) => !seen.has(modelKey(selection)))
    .map((selection) => ({
      key: modelKey(selection),
      label: modelLabel(selection, names),
      selection,
    }));

  return [...used, ...extra];
}

export function threadTitle(prompt: string): string {
  const firstLine =
    prompt
      .trim()
      .split("\n")
      .find((line) => line.trim().length > 0) ?? "New session";
  return firstLine.trim().slice(0, 60);
}

// The preference used to default to this, which matches neither release bundle, so a
// stored copy counts as unset unless an app with that exact name is installed.
const LEGACY_APP_NAME = "T3 Code";
const STABLE_APP = "T3 Code (Alpha)";
const NIGHTLY_APP = "T3 Code (Nightly)";
// Same pattern T3 uses to brand a build as Nightly. Preview builds share the branding.
const NIGHTLY_VERSION = /^[^-+]+-(?:nightly|preview)\.\d{8}\.\d+$/;

async function isInstalled(name: string): Promise<boolean> {
  for (const dir of ["/Applications", join(homedir(), "Applications")]) {
    try {
      await access(join(dir, `${name}.app`));
      return true;
    } catch {
      // not in this folder
    }
  }
  return false;
}

/** The app bundle is named after its release channel, so a fixed name only fits one
 * of them. The preference wins; otherwise follow the running server's version, and
 * with no server running use whichever app is installed, stable first. */
async function appName(): Promise<string> {
  const configured = preferences().appName?.trim();
  if (
    configured &&
    (configured !== LEGACY_APP_NAME || (await isInstalled(configured)))
  ) {
    return configured;
  }
  try {
    const { serverVersion } = await serverDescriptor(await resolveOrigin());
    if (serverVersion) {
      return NIGHTLY_VERSION.test(serverVersion) ? NIGHTLY_APP : STABLE_APP;
    }
  } catch {
    // the server is not running, so look at what is installed
  }
  return (await isInstalled(STABLE_APP)) || !(await isInstalled(NIGHTLY_APP))
    ? STABLE_APP
    : NIGHTLY_APP;
}

const escapeForAppleScript = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** What the T3 command palette knows about a thread. */
export type PaletteThread = {
  id: string;
  title: string;
  projectTitle: string | undefined;
  branch: string | null;
};

// Mirrors normalizeSearchText in T3's CommandPalette.logic.ts, so a match counted
// here is a match the palette will list.
const normalizeSearchText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const paletteQuery = (thread: PaletteThread) =>
  [thread.title, thread.projectTitle, thread.branch]
    .filter((part): part is string => Boolean(part))
    .join(" ");

/** The palette lists a thread when every query token appears somewhere in its
 * title, project title or branch. */
export function paletteMatchCount(
  threads: PaletteThread[],
  query: string,
): number {
  const tokens = normalizeSearchText(query).split(" ");
  return threads.filter((thread) => {
    const haystack = normalizeSearchText(
      [thread.title, thread.projectTitle ?? "", thread.branch ?? ""].join(" "),
    );
    return tokens.every((token) => haystack.includes(token));
  }).length;
}

export function paletteThreads(snapshot: ShellSnapshot): PaletteThread[] {
  const projectTitles = new Map(
    snapshot.projects.map((project) => [project.id, project.title]),
  );
  return liveThreads(snapshot).map((thread) => ({
    id: thread.id,
    title: thread.title,
    projectTitle: projectTitles.get(thread.projectId),
    branch: thread.branch,
  }));
}

/** The desktop app registers t3code:// for Clerk callbacks only: an external URL
 * reveals the window but never navigates. So focus the app and drive its own
 * command palette with the thread's title, project and branch. The query is typed
 * first, then matches are counted against a shell snapshot fetched at that moment,
 * so a thread created since the list loaded still counts. Enter is pressed only
 * when exactly one thread matches and T3 Code is still frontmost; otherwise the
 * palette is left as it is and the result says why, so the caller can tell the user. */
export async function focusThread(
  target: PaletteThread,
): Promise<"opened" | "ambiguous" | "unfocused"> {
  const query = paletteQuery(target);
  const name = await appName();
  await run("/usr/bin/open", ["-a", name]);
  await run("/usr/bin/osascript", [
    "-e",
    `
tell application "${escapeForAppleScript(name)}" to activate
delay 0.35
tell application "System Events"
  keystroke "k" using command down
  delay 0.35
  keystroke "${escapeForAppleScript(query)}"
end tell`,
  ]);
  const live = paletteThreads(await getShell());
  // A thread that was just created can lag behind the shell projection.
  const candidates = live.some((thread) => thread.id === target.id)
    ? live
    : [...live, target];
  if (paletteMatchCount(candidates, query) !== 1) {
    return "ambiguous";
  }
  // The user may have switched apps while the snapshot loaded. Bring T3 Code back
  // and send Enter only if it really is in front, so the key never lands elsewhere.
  const { stdout } = await run("/usr/bin/osascript", [
    "-e",
    `
tell application "${escapeForAppleScript(name)}" to activate
delay 0.3
if frontmost of application "${escapeForAppleScript(name)}" then
  tell application "System Events" to key code 36
  return "opened"
end if
return "unfocused"`,
  ]);
  return stdout.trim() === "opened" ? "opened" : "unfocused";
}

export async function launchApp(): Promise<void> {
  await run("/usr/bin/open", ["-a", await appName()]);
}

export function worktreePathFor(workspaceRoot: string, branch: string): string {
  const repoName = workspaceRoot.split("/").filter(Boolean).pop() ?? "repo";
  return join(WORKTREES_DIR, repoName, branch.replace(/\//g, "-"));
}

/** The default branch of a repository is whatever origin/HEAD points at, not
 * necessarily `main`. Falls back to the checked-out branch when there is no
 * remote to ask. */
export async function defaultBaseBranch(
  workspaceRoot: string,
): Promise<string> {
  try {
    const { stdout } = await run("git", [
      "-C",
      workspaceRoot,
      "symbolic-ref",
      "--short",
      "refs/remotes/origin/HEAD",
    ]);
    const ref = stdout.trim();
    if (ref.startsWith("origin/")) {
      return ref.slice("origin/".length);
    }
  } catch {
    // no origin, or origin/HEAD was never resolved on this clone
  }
  try {
    const { stdout } = await run("git", [
      "-C",
      workspaceRoot,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    return stdout.trim() || "main";
  } catch {
    return "main";
  }
}

async function hasOrigin(workspaceRoot: string): Promise<boolean> {
  try {
    const { stdout } = await run("git", ["-C", workspaceRoot, "remote"]);
    return stdout.split("\n").some((remote) => remote.trim() === "origin");
  } catch {
    return false;
  }
}

/** T3 prepares worktrees on its WebSocket path only, so the extension does the same
 * two steps itself: fetch the base, then add the worktree where T3 would have put it.
 * A repository with an origin must fetch successfully, otherwise the new branch would
 * silently start from a stale local ref. */
export async function createWorktree(input: {
  workspaceRoot: string;
  branch: string;
  baseBranch: string;
}): Promise<string> {
  const target = worktreePathFor(input.workspaceRoot, input.branch);
  let base = input.baseBranch;
  if (await hasOrigin(input.workspaceRoot)) {
    try {
      await run("git", [
        "-C",
        input.workspaceRoot,
        "fetch",
        "origin",
        input.baseBranch,
      ]);
    } catch (error) {
      throw new Error(
        `Could not fetch origin/${input.baseBranch}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    base = `origin/${input.baseBranch}`;
  }
  await run("git", [
    "-C",
    input.workspaceRoot,
    "worktree",
    "add",
    "-b",
    input.branch,
    target,
    base,
  ]);
  return target;
}

/** Undoes createWorktree when a later step of starting the session fails. */
export async function removeWorktree(
  workspaceRoot: string,
  worktreePath: string,
  branch: string,
): Promise<void> {
  try {
    await run("git", [
      "-C",
      workspaceRoot,
      "worktree",
      "remove",
      "--force",
      worktreePath,
    ]);
    await run("git", ["-C", workspaceRoot, "branch", "-D", branch]);
  } catch {
    // leave whatever could not be cleaned up; the session error is what matters
  }
}

export async function startSession(input: {
  projectId: string;
  prompt: string;
  /** Defaults to the first line of the prompt. */
  title?: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  branch: string | null;
  worktreePath: string | null;
  attachments?: AttachmentFile[];
}): Promise<string> {
  const threadId = randomUUID();
  const createdAt = new Date().toISOString();
  const title = input.title ?? threadTitle(input.prompt);

  await dispatch({
    type: "thread.create",
    commandId: randomUUID(),
    threadId,
    projectId: input.projectId,
    title,
    modelSelection: input.modelSelection,
    runtimeMode: input.runtimeMode,
    interactionMode: "default",
    branch: input.branch,
    worktreePath: input.worktreePath,
    createdAt,
  });

  try {
    await dispatch({
      type: "thread.turn.start",
      commandId: randomUUID(),
      threadId,
      message: {
        messageId: randomUUID(),
        role: "user",
        text: input.prompt,
        attachments: await Promise.all(
          (input.attachments ?? []).map(inlineAttachment),
        ),
      },
      modelSelection: input.modelSelection,
      titleSeed: title,
      runtimeMode: input.runtimeMode,
      interactionMode: "default",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // An empty thread is worse than none: drop it so a retry does not pile up
    // half-started sessions in the sidebar.
    await dispatch({
      type: "thread.delete",
      commandId: randomUUID(),
      threadId,
    }).catch(() => undefined);
    throw error;
  }

  return threadId;
}

export const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
const UPLOAD_TIMEOUT_MS = 5 * 60_000;
const LAUNCH_TIMEOUT_MS = 5 * 60_000;
export const MAX_ATTACHMENTS = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** What was checked about a file. The bytes are read only when it is sent, one file at a
 * time, so eight 50 MB files never sit in memory together. */
export type AttachmentFile = {
  kind: "image" | "file";
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
};

/** The extension decides images, since T3 accepts only four types as images; anything
 * else goes to `file` for its mime type, which the server stores and hands to the agent. */
async function mimeTypeOf(path: string): Promise<string> {
  const known = IMAGE_MIME_TYPES[extname(path).toLowerCase()];
  if (known) {
    return known;
  }
  try {
    const { stdout } = await run("file", ["--brief", "--mime-type", path]);
    return stdout.trim().slice(0, 100) || "application/octet-stream";
  } catch {
    return "application/octet-stream";
  }
}

/** Reads a file the way T3 will accept it: images up to 10 MiB, other files up to 50 MiB. */
export async function readAttachment(path: string): Promise<AttachmentFile> {
  const name = basename(path);
  const mimeType = await mimeTypeOf(path);
  const kind = Object.values(IMAGE_MIME_TYPES).includes(mimeType)
    ? "image"
    : "file";
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  const info = await stat(path);
  if (!info.isFile()) {
    throw new Error(`${name} is not a file.`);
  }
  if (info.size === 0 || info.size > limit) {
    throw new Error(
      `${name} must be between 1 byte and ${limit / 1024 / 1024} MB.`,
    );
  }
  return { kind, name, path, mimeType, sizeBytes: info.size };
}

/** v1 servers take image bytes inside the turn itself and have no file attachments. */
async function inlineAttachment(attachment: AttachmentFile) {
  if (attachment.kind !== "image") {
    throw new Error(
      `${attachment.name} cannot be sent: this T3 Code server only accepts images. Update T3 Code to attach other files.`,
    );
  }
  return {
    type: "image",
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    dataUrl: `data:${attachment.mimeType};base64,${(await readFile(attachment.path)).toString("base64")}`,
  };
}

async function openServerRpc(): Promise<RpcConnection> {
  const origin = await resolveOrigin();
  const version = await serverProtocolVersion(origin);
  const { ticket } = await request<{ ticket: string }>(
    "/api/auth/websocket-ticket",
    { method: "POST" },
    true,
    origin,
  );
  const url = new URL(origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = new URLSearchParams({
    orchestrationProtocol: String(version),
    wsTicket: ticket,
  }).toString();
  try {
    return await openRpc(url.toString());
  } catch (error) {
    throw new T3Error(
      "unreachable",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** v2 servers hold uploads until a turn claims them: ask for a signed URL, post the
 * bytes there, then reference the attachment by id. */
async function uploadAttachments(
  rpc: RpcConnection,
  attachments: AttachmentFile[],
) {
  const origin = await resolveOrigin();
  const uploaded = [];
  for (const attachment of attachments) {
    const slot = await rpc.call<{ attachmentId: string; relativeUrl: string }>(
      "attachments.createUploadUrl",
      {
        type: attachment.kind,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
    );
    const response = await fetch(`${origin}${slot.relativeUrl}`, {
      method: "POST",
      headers: { "Content-Type": attachment.mimeType },
      body: await readFile(attachment.path),
      // The signed URL is the only thing authorising this upload, so a redirect to
      // somewhere else is an error, and a stalled server cannot hang the command.
      redirect: "error",
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `Uploading ${attachment.name} failed with ${response.status}. ${(await response.text().catch(() => "")).slice(0, 200)}`,
      );
    }
    uploaded.push({
      type: attachment.kind,
      id: slot.attachmentId,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    });
  }
  return uploaded;
}

/** The v2 path. One call creates the thread, prepares its worktree and sends the first
 * message, so the extension no longer runs git itself. */
export async function launchThread(input: {
  projectId: string;
  title: string;
  prompt: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  workspace:
    | { type: "root" }
    | {
        type: "worktree";
        baseRef: string;
        branch: string;
        startFromOrigin: boolean;
      };
  attachments: AttachmentFile[];
}): Promise<string> {
  const rpc = await openServerRpc();
  try {
    const attachments = await uploadAttachments(rpc, input.attachments);
    const result = await rpc.call<{ threadId: string }>(
      "orchestration.launchThread",
      {
        commandId: randomUUID(),
        // Uploaded attachments are claimed by thread id, so it is fixed up front.
        threadId: randomUUID(),
        projectId: input.projectId,
        title: input.title,
        generateTitle: false,
        modelSelection: input.modelSelection,
        runtimeMode: input.runtimeMode,
        interactionMode: "default",
        workspaceStrategy: input.workspace,
        initialMessage: {
          messageId: randomUUID(),
          text: input.prompt,
          attachments,
        },
      },
      LAUNCH_TIMEOUT_MS,
    );
    return result.threadId;
  } finally {
    rpc.close();
  }
}

export async function hasOriginRemote(workspaceRoot: string): Promise<boolean> {
  return hasOrigin(workspaceRoot);
}
