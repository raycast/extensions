import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { getPreferenceValues } from "@raycast/api";

const run = promisify(execFile);

export type ModelSelection = {
  instanceId: string;
  model: string;
  options?: { id: string; value: string }[];
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
};

export type ShellSnapshot = {
  snapshotSequence: number;
  projects: Project[];
  threads: Thread[];
  updatedAt: string;
};

export type EnvironmentDescriptor = {
  environmentId: string;
  label: string;
  serverVersion: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const origin = await resolveOrigin();
  assertTokenSafeOrigin(origin);
  const { token } = preferences();
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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

export const getShell = () =>
  request<ShellSnapshot>("/api/orchestration/shell");

export const getDescriptor = () =>
  request<EnvironmentDescriptor>("/.well-known/t3/environment");

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
export function modelKey(selection: ModelSelection): string {
  const options = (selection.options ?? [])
    .map((option) => `${option.id}=${option.value}`)
    .sort()
    .join(",");
  return `${selection.instanceId}|${selection.model}|${options}`;
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

export function modelLabel(selection: ModelSelection): string {
  const options = (selection.options ?? [])
    .filter((option) => option.id !== "fastMode")
    .map((option) => option.value);
  return [selection.model, ...options].join(" · ");
}

type ProviderInstances = Record<string, { enabled?: boolean } | undefined>;

/** Models the manifest lists for providers that are actually enabled. Read from disk
 * because the server publishes the manifest over the WebSocket only; a missing or
 * unreadable file just means the picker falls back to what threads already use. */
async function manifestSelections(): Promise<ModelSelection[]> {
  try {
    const [manifestRaw, settingsRaw] = await Promise.all([
      readFile(join(RUNTIME_DIR, "model-manifest.json"), "utf8"),
      readFile(join(RUNTIME_DIR, "settings.json"), "utf8"),
    ]);
    const manifest = JSON.parse(manifestRaw) as {
      manifest?: { currentModels?: Record<string, string[]> };
    };
    const settings = JSON.parse(settingsRaw) as {
      providerInstances?: ProviderInstances;
    };
    const instances = settings.providerInstances ?? {};
    const current = manifest.manifest?.currentModels ?? {};
    return Object.entries(current)
      .filter(([instanceId]) => instances[instanceId]?.enabled === true)
      .flatMap(([instanceId, models]) =>
        models.map((model) => ({ instanceId, model })),
      );
  } catch {
    return [];
  }
}

/** Every selection worth offering: the ones this machine has actually run, most
 * recently used first, then anything else the enabled providers currently support. */
export async function modelChoices(
  snapshot: ShellSnapshot,
): Promise<{ key: string; label: string; selection: ModelSelection }[]> {
  const seen = new Map<string, { selection: ModelSelection; at: number }>();
  for (const thread of snapshot.threads) {
    if (!thread.modelSelection || thread.deletedAt) {
      continue;
    }
    const key = modelKey(thread.modelSelection);
    const at = threadTimestamp(thread);
    const previous = seen.get(key);
    if (!previous || at > previous.at) {
      seen.set(key, { selection: thread.modelSelection, at });
    }
  }
  const used = [...seen.entries()]
    .sort((a, b) => b[1].at - a[1].at)
    .map(([key, value]) => ({
      key,
      label: modelLabel(value.selection),
      selection: value.selection,
    }));

  const extra = (await manifestSelections())
    .filter((selection) => !seen.has(modelKey(selection)))
    .map((selection) => ({
      key: modelKey(selection),
      label: modelLabel(selection),
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

export const deepLink = (environmentId: string, threadId: string) =>
  `t3code://app/${environmentId}/${threadId}`;

const escapeForAppleScript = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** The desktop app registers t3code:// for Clerk callbacks only: an external URL
 * reveals the window but never navigates. So focus the app and drive its own
 * command palette, which searches threads by title, project and branch. */
export async function focusThread(title: string): Promise<void> {
  const appName = preferences().appName?.trim() || "T3 Code (Nightly)";
  await run("/usr/bin/open", ["-a", appName]);
  const script = `
tell application "${escapeForAppleScript(appName)}" to activate
delay 0.35
tell application "System Events"
  keystroke "k" using command down
  delay 0.35
  keystroke "${escapeForAppleScript(title)}"
  delay 0.45
  key code 36
end tell`;
  await run("/usr/bin/osascript", ["-e", script]);
}

export async function launchApp(): Promise<void> {
  const appName = preferences().appName?.trim() || "T3 Code (Nightly)";
  await run("/usr/bin/open", ["-a", appName]);
}

export function worktreePathFor(workspaceRoot: string, branch: string): string {
  const repoName = workspaceRoot.split("/").filter(Boolean).pop() ?? "repo";
  return join(WORKTREES_DIR, repoName, branch.replace(/\//g, "-"));
}

/** T3 prepares worktrees on its WebSocket path only, so the extension does the same
 * two steps itself: fetch the base, then add the worktree where T3 would have put it. */
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
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  branch: string | null;
  worktreePath: string | null;
}): Promise<string> {
  const threadId = randomUUID();
  const createdAt = new Date().toISOString();
  const title = threadTitle(input.prompt);

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
        attachments: [],
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
