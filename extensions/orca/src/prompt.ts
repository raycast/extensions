import { unwrap } from "./orca.ts";

const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/**
 * Worktree names end up as branch names and directory names, so they have to be
 * latin. Russian prompts are the common case here, hence the transliteration
 * rather than stripping non-ASCII and ending up with an empty string.
 */
export function slugify(prompt: string, maxLength = 40): string {
  const latin = [...prompt.toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join("");

  const words = latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean);

  const name: string[] = [];
  for (const word of words) {
    const candidate = [...name, word].join("-");
    if (name.length > 0 && candidate.length > maxLength) break;
    name.push(word);
  }

  return name.join("-").slice(0, maxLength);
}

/**
 * The inline text a saved command accepts at launch, appended to the stored
 * prompt. Blank input means the prompt goes out unchanged.
 *
 * `extra` may still hold a literal `{clipboard}` or `{selection}` when Raycast
 * does not expand a placeholder — a nested one in an argument default, say. In
 * that case the text is substituted here instead, so the behaviour holds either way.
 */
export function composePrompt(
  prompt: string,
  extra?: string,
  sources: { clipboard?: string; selection?: string } = {},
): string {
  const resolved = extra
    ?.replace(/\{clipboard[^}]*\}/g, sources.clipboard ?? "")
    .replace(/\{selection[^}]*\}/g, sources.selection ?? "");

  const addition = resolved?.trim();
  return addition ? `${prompt}\n\n${addition}` : prompt;
}

/** Everything a saved prompt needs to start an agent; this is what a Quicklink carries. */
export type PromptSpec = {
  repoId: string;
  /** Where the agent runs when no worktree is created. */
  worktreePath: string;
  agent: string;
  createWorktree: boolean;
  worktreeName?: string;
  prompt: string;
};

/**
 * The name Orca will use for the checkout. A typed name becomes a branch and a
 * directory just as a derived one does, so both take the same safe latin form —
 * and the preview and the CLI call share this, or the form would promise a name
 * different from the one created.
 */
export function worktreeNameFor(spec: PromptSpec): string {
  return slugify(spec.worktreeName?.trim() || spec.prompt) || "prompt";
}

/** Orca creates the checkout, launches the agent and delivers the prompt in one call. */
export function worktreeCreateArgs(spec: PromptSpec): string[] {
  return [
    "worktree",
    "create",
    "--repo",
    `id:${spec.repoId}`,
    "--name",
    worktreeNameFor(spec),
    "--agent",
    spec.agent,
    "--prompt",
    spec.prompt,
    "--json",
  ];
}

/**
 * A fresh pane in the existing checkout. Orca has no flag to seed a prompt here,
 * so the caller follows up with terminalSendArgs once the handle is known.
 */
export function terminalCreateArgs(spec: PromptSpec): string[] {
  return [
    "terminal",
    "create",
    "--worktree",
    `path:${spec.worktreePath}`,
    "--command",
    spec.agent,
    "--json",
  ];
}

export function terminalSendArgs(handle: string, prompt: string): string[] {
  return [
    "terminal",
    "send",
    "--terminal",
    handle,
    "--text",
    prompt,
    "--enter",
    "--json",
  ];
}

export type OrcaRepo = { id: string; path: string; displayName?: string };
export type OrcaWorktreeRow = {
  repoId: string;
  path: string;
  isMainWorktree?: boolean;
};

/** One entry of the project dropdown. */
export type Project = { id: string; name: string; path: string };

/**
 * A repo can have several checkouts; the main one is where "run in the same
 * folder" belongs. A repo Orca has not checked out yet still offers its own path.
 */
export function projectsFrom(
  repos: OrcaRepo[],
  worktrees: OrcaWorktreeRow[],
): Project[] {
  const mainByRepo = new Map<string, string>();
  for (const worktree of worktrees) {
    if (worktree.isMainWorktree) mainByRepo.set(worktree.repoId, worktree.path);
  }

  return repos.map((repo) => ({
    id: repo.id,
    name:
      repo.displayName ??
      repo.path.split("/").filter(Boolean).pop() ??
      repo.path,
    path: mainByRepo.get(repo.id) ?? repo.path,
  }));
}

type Exec = (path: string, args: string[]) => Promise<{ stdout: string }>;

async function call<T>(
  orcaPath: string,
  args: string[],
  exec: Exec,
): Promise<T | undefined> {
  const { stdout } = await exec(orcaPath, args);
  return unwrap<T>(stdout);
}

export async function loadProjects(
  orcaPath: string,
  exec: Exec,
): Promise<Project[]> {
  const [repos, worktrees] = await Promise.all([
    call<{ repos: OrcaRepo[] }>(orcaPath, ["repo", "list", "--json"], exec),
    call<{ worktrees: OrcaWorktreeRow[] }>(
      orcaPath,
      ["worktree", "list", "--limit", "200", "--json"],
      exec,
    ),
  ]);

  return projectsFrom(repos?.repos ?? [], worktrees?.worktrees ?? []);
}

/**
 * Starts the agent and hands it the prompt. Returns the terminal handle when
 * Orca reports one, so the caller can bring that pane to the front.
 */
export async function runPrompt(
  spec: PromptSpec,
  orcaPath: string,
  exec: Exec,
): Promise<string | undefined> {
  if (spec.createWorktree) {
    const created = await call<{
      agentTerminalHandle?: string;
      startupTerminal?: { handle?: string };
    }>(orcaPath, worktreeCreateArgs(spec), exec);
    return created?.agentTerminalHandle ?? created?.startupTerminal?.handle;
  }

  const terminal = await call<{
    terminal?: { handle?: string };
    handle?: string;
  }>(orcaPath, terminalCreateArgs(spec), exec);
  const handle = terminal?.terminal?.handle ?? terminal?.handle;
  if (!handle)
    throw new Error("Orca created no terminal to send the prompt to");

  await call(orcaPath, terminalSendArgs(handle, spec.prompt), exec);
  return handle;
}

/** Where the text appended at launch comes from. */
export type ExtraSource =
  "none" | "ask" | "ask-clipboard" | "clipboard" | "selection" | "browser-tab";

/**
 * `json-stringify` makes Raycast quote and escape the value, so a quote or a
 * newline in the text cannot break the JSON the deeplink carries.
 */
const PLACEHOLDERS: Record<Exclude<ExtraSource, "none">, string> = {
  ask: '{argument name="Extra" | json-stringify}',
  "ask-clipboard":
    '{argument name="Extra" default="{clipboard}" | json-stringify}',
  clipboard: "{clipboard | json-stringify}",
  selection: "{selection | json-stringify}",
  "browser-tab": "{browser-tab | json-stringify}",
};

export function extraPlaceholder(source: Exclude<ExtraSource, "none">): string {
  return PLACEHOLDERS[source];
}

/**
 * Raycast expands placeholders by scanning the Quicklink's link text, so the
 * braces have to survive un-encoded — hence appending the argument by hand
 * instead of letting createDeeplink serialise it.
 */
export function withExtraArgument(
  deeplink: string,
  source: ExtraSource,
): string {
  if (source === "none") return deeplink;
  const separator = deeplink.includes("?") ? "&" : "?";
  return `${deeplink}${separator}arguments={"extra":${extraPlaceholder(source)}}`;
}

const EXTRA_LABELS: Record<Exclude<ExtraSource, "none">, string> = {
  ask: "[what you type when running it]",
  "ask-clipboard": "[what you type when running it, clipboard pre-filled]",
  clipboard: "[clipboard text]",
  selection: "[selected text]",
  "browser-tab": "[current browser tab]",
};

/**
 * What the saved command will actually do, spelled out while the form is being
 * filled in. Split into labelled lines because Form.Description collapses
 * newlines into one paragraph. The prompt itself is left out: it is already on
 * screen in its own field, and repeating it pushes this below the fold. The
 * appended text shows as a placeholder, since its value only exists at launch.
 */
export function previewParts(
  spec: PromptSpec,
  source: ExtraSource,
  name: string,
): { command: string; extra?: string; runs: string } {
  return {
    command: commandName(name),
    extra: source === "none" ? undefined : EXTRA_LABELS[source],
    runs: spec.createWorktree
      ? `${spec.agent} in a new worktree "${worktreeNameFor(spec)}" off ${spec.worktreePath}`
      : `${spec.agent} in ${spec.worktreePath}`,
  };
}

export const COMMAND_PREFIX = "Orca / ";

/**
 * Saved prompts all carry the same prefix, so typing "orca" in the root search
 * brings up the extension's commands and every saved prompt together.
 */
export function commandName(name: string): string {
  const trimmed = name.trim();
  return trimmed.startsWith(COMMAND_PREFIX)
    ? trimmed
    : `${COMMAND_PREFIX}${trimmed}`;
}
