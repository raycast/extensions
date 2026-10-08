/// <reference types="node" />

import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

/**
 * Where Claude Code reads user-level hook registrations from.
 *
 * `settings.local.json` is the untracked per-machine override and is checked
 * too, because registering the hook there is just as valid as registering it in
 * `settings.json`.
 *
 * ponytail: user scope only. Claude Code also honours project-level
 * `.claude/settings.json` and enterprise managed policy, so a hook registered
 * ONLY in a project is reported here as missing — a FALSE WARNING, telling
 * someone to set up tracking that already works for them.
 *
 * Accepted rather than fixed, because there is no honest fix at this scope: a
 * launcher command has no project context to resolve `.claude/` against, and
 * guessing one from the indexed artifacts' `cwd` would still miss every project
 * that has not published yet. The recorder writes a single global index and the
 * README documents user-level registration only, so a project-only setup is off
 * the documented path. Widen this list if that turns out to be a real setup
 * rather than a theoretical one.
 */
export const SETTINGS_PATHS = [
  path.join(homedir(), ".claude", "settings.json"),
  path.join(homedir(), ".claude", "settings.local.json"),
];

/**
 * Where the README tells people to install the recorder.
 *
 * Only a default. The registration in `settings.json` is authoritative about
 * where the script actually lives — see `resolveHookScriptPath`.
 */
export const DEFAULT_HOOK_SCRIPT_PATH = path.join(homedir(), ".claude", "hooks", "record-artifact.sh");

export const SETUP_DOCS_URL = "https://github.com/chrismessina/raycast-claude-artifacts#setup";

/**
 * The `PostToolUse` hook entry the user must add to enable the index.
 *
 * Offered as a clipboard copy rather than written for them: `settings.json` is
 * hand-curated, and an extension that rewrites it would be editing config the
 * user owns. That stance hardened after the failure this module exists to
 * detect — the entry was lost when a THIRD-PARTY integration rewrote the
 * `hooks` block. An extension that silently rewrote the same block to heal it
 * would be the identical failure under our own name, racing the very installers
 * that caused it.
 */
export const HOOK_SNIPPET = `{
  "matcher": "Artifact",
  "hooks": [
    {
      "type": "command",
      "command": "$HOME/.claude/hooks/record-artifact.sh",
      "timeout": 10
    }
  ]
}`;

/** Canonical source of the recorder, so the prompt below can cite something readable. */
export const HOOK_SCRIPT_URL =
  "https://raw.githubusercontent.com/chrismessina/raycast-claude-artifacts/main/scripts/record-artifact.sh";

/**
 * A prompt the user pastes into Claude Code, which then performs the install.
 *
 * This is the primary path, and `HOOK_SNIPPET` is now the fallback — a bare JSON
 * fragment on the clipboard turned out to be a dead end in practice. It is not a
 * whole settings file, it names a script that a new user does not have yet, and
 * it carries no hint that it must be APPENDED to an existing array rather than
 * pasted over it. Handing the same fragment to the agent that already has file
 * access closes all three gaps at once.
 *
 * Written as instructions to an agent, so it is deliberately explicit about the
 * things a human skimming the README gets wrong:
 *
 * - **Show the script before installing it.** The recorder lives in the repo
 *   rather than the extension bundle precisely so it can be read first; a prompt
 *   that silently curls a shell script into `~/.claude/hooks` would throw that
 *   away.
 * - **Append, never replace.** `settings.json` is hand-curated and usually
 *   already holds other integrations' hooks. Clobbering that array is the exact
 *   failure that made this warning necessary.
 * - **Restart.** Registration only takes effect in a new session, so an install
 *   that looks successful still records nothing until then. Without this line
 *   the user's first test appears to fail.
 */
export const SETUP_PROMPT = `Set up Claude Code to track the artifacts I publish, so they show up in the Claude Artifacts Raycast extension.

1. Show me ${HOOK_SCRIPT_URL} first so I can read it, then install it to ~/.claude/hooks/record-artifact.sh and make it executable.

2. Back up ~/.claude/settings.json. Then APPEND this entry to hooks.PostToolUse — create the array if it does not exist, and do not replace, reorder, or remove any entry already in it:

${HOOK_SNIPPET}

3. Verify the registration actually landed:

jq '[.hooks.PostToolUse[]? | select(.matcher == "Artifact") | .hooks[]? | select((.command // "") | test("record-artifact"))] | length' ~/.claude/settings.json

That must print 1 or more. Tell me if it prints 0.

4. Confirm that neither \`disableAllHooks\` nor \`allowManagedHooksOnly\` is set to true in that file. Either one stops the hook running even when it is registered perfectly.

The hook needs \`jq\` and \`perl\` — tell me if either is missing.

Finally: tell me to publish a test artifact and check that it appears, and that if it does not, restarting Claude Code is the first thing to try — a newly registered hook is not always picked up by an already-running session.`;

/**
 * A prompt for REPAIRING an install that exists but has stopped working.
 *
 * Takes the RESOLVED script path rather than hardcoding the documented one.
 * Doctor diagnoses whatever `settings.json` actually registers, so a prompt that
 * always names `~/.claude/hooks/record-artifact.sh` would repair a file the
 * registration does not use — leaving recording broken while the instructions
 * looked like they had been followed.
 *
 * Separate from `SETUP_PROMPT` because the two failures need opposite
 * instructions. Setup appends a registration and installs a script. Repair must
 * do neither: the registration is already correct and appending a second one
 * would double every future publish, so the only change wanted is the script's
 * contents.
 *
 * Telling someone to "run setup again" when the hook is registered and running
 * sends them to fix the part that is not broken — which is exactly how the
 * 2026-09 outage stayed invisible, since every structural check was green while
 * the script silently failed to parse the new URL format.
 */
/**
 * POSIX single-quoting, for a path going into a shell command.
 *
 * `scriptFromCommand` deliberately supports registered paths containing spaces,
 * so a prompt that interpolates one bare would hand the user a command that
 * runs the wrong file — the very inconsistency this prompt exists to fix.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function updatePrompt(scriptPath: string): string {
  return `The Claude Code hook that records my published artifacts has stopped recording them. It is installed and registered correctly — the script itself is out of date.

1. Show me ${HOOK_SCRIPT_URL} so I can read it, then overwrite ${scriptPath} with it, keeping its current permissions.

2. Do NOT touch ~/.claude/settings.json. The registration is already correct, and adding a second one would record every publish twice.

3. Verify the updated script actually parses a current artifact URL, without touching my real index — point HOME at a scratch directory so the write lands there:

d="$(mktemp -d)" && mkdir -p "$d/.claude" && echo '{"cwd":"/tmp","tool_name":"Artifact","tool_input":{},"tool_response":{"url":"https://claude.ai/artifact/RaycastDoctorSelfTest1","title":"Self-Test","audience":"owner"}}' | HOME="$d" bash ${shellQuote(scriptPath)}; cat "$d/.claude/artifacts.json"

That must print a row whose id is RaycastDoctorSelfTest1. If it prints nothing, or the file does not exist, the update did not take.

4. Do NOT tell me to restart Claude Code. The hook is spawned fresh for every tool call, so it reads the new file from disk on the very next publish. A restart is only needed when the REGISTRATION in settings.json changes, and step 2 says not to touch it.

Then tell me to run the Run Doctor command in the Claude Artifacts Raycast extension again, and to use its Backfill action to recover the artifacts that were dropped while the hook was broken.`;
}

/**
 * Whether a `PostToolUse` hook that records artifacts is currently registered.
 *
 * `"unknown"` is a distinct outcome from `"missing"` on purpose: an unreadable
 * or malformed settings file is not evidence that the hook is absent, and
 * warning on it would accuse the user of a misconfiguration we cannot see.
 * Only `"missing"` — a file we parsed successfully that contains no matching
 * entry — is worth interrupting them for.
 */
export type HookStatus = "registered" | "missing" | "disabled" | "unknown";

/**
 * Settings that stop hooks running regardless of what is registered.
 *
 * `disableAllHooks` is a global kill switch; `allowManagedHooksOnly` restricts
 * execution to hooks set by enterprise policy, which a user-registered recorder
 * is not. Either one makes a perfectly well-formed registration inert.
 *
 * Tracked as a SEPARATE status from `"missing"` because the remedy is the
 * opposite: the hook is already installed, and telling someone to install it
 * again sends them to fix something that is not broken.
 */
const HOOK_KILL_SWITCHES = ["disableAllHooks", "allowManagedHooksOnly"] as const;

interface HookCommand {
  command?: unknown;
}

interface HookEntry {
  matcher?: unknown;
  hooks?: unknown;
}

/**
 * Does this entry fire for the `Artifact` tool?
 *
 * An absent or empty matcher matches every tool — that is how Claude Code's
 * own integrations register themselves, so it must count as covering
 * `Artifact`. A present matcher is a regex tested against the tool name.
 */
function matchesArtifactTool(matcher: unknown): boolean {
  if (matcher === undefined || matcher === null || matcher === "") return true;
  if (typeof matcher !== "string") return false;

  try {
    return new RegExp(matcher).test("Artifact");
  } catch {
    // A malformed regex in someone's settings is their problem, not a crash in
    // ours. Treat it as non-matching.
    return false;
  }
}

/**
 * Does this entry actually run an artifact recorder?
 *
 * The matcher alone is NOT sufficient evidence. Unrelated integrations register
 * catch-all `PostToolUse` hooks with no matcher, which fire on `Artifact` too —
 * counting those would report the index as healthy while nothing writes to it,
 * which is precisely the failure this check exists to catch. The command itself
 * has to be about artifacts.
 *
 * Matched loosely rather than against the documented script path, so a renamed
 * or relocated recorder still counts as registered. The one exception is the
 * shipped diagnostic probe: it is deliberately installed as an Artifact hook
 * but never writes the index, so exclude its stable basename while keeping the
 * recorder path otherwise unconstrained.
 */
function recorderCommand(hooks: unknown): string | undefined {
  if (!Array.isArray(hooks)) return undefined;

  return (hooks as HookCommand[]).find(
    (hook) =>
      typeof hook?.command === "string" &&
      /artifact/i.test(hook.command) &&
      !/(?:^|[/\\\s'"])probe-artifact-hook\.sh\b/i.test(hook.command),
  )?.command as string | undefined;
}

function hasArtifactHook(settings: unknown): boolean {
  return artifactHookCommand(settings) !== undefined;
}

/**
 * The shell command of the registered recorder, if one is registered.
 *
 * Same traversal as the boolean check above, kept as one function so the two
 * questions — "is a recorder registered?" and "which script is it?" — can never
 * disagree about which entry counts. Doctor needs the path so it can exercise
 * the user's ACTUAL script rather than assuming the documented location.
 */
function artifactHookCommand(settings: unknown): string | undefined {
  if (typeof settings !== "object" || settings === null) return undefined;

  const postToolUse = (settings as { hooks?: { PostToolUse?: unknown } }).hooks?.PostToolUse;
  if (!Array.isArray(postToolUse)) return undefined;

  for (const entry of postToolUse as HookEntry[]) {
    if (!matchesArtifactTool(entry?.matcher)) continue;
    const command = recorderCommand(entry?.hooks);
    if (command) return command;
  }
  return undefined;
}

/**
 * Interpreters and launchers that may PRECEDE the script in a hook command.
 *
 * `bash $HOME/.../record.sh` is a legal registration, and naively taking the
 * first token diagnoses `/bin/bash` as the recorder. Matched on basename so an
 * absolute or bare spelling behaves the same.
 */
const LAUNCHERS = /^(?:env|sh|bash|zsh|dash|ksh|node|perl|python|python3)$/;

/** Resolve the shell's home shorthands, which are literal text in the settings file. */
function expandHome(token: string): string {
  return token
    .replace(/^\$\{HOME\}/, homedir())
    .replace(/^\$HOME/, homedir())
    .replace(/^~(?=\/|$)/, homedir());
}

/**
 * Pick the script out of a hook command line.
 *
 * Quoted segments are considered FIRST, because a path containing a space can
 * only be expressed by quoting it and splitting on whitespace would shred it.
 * Otherwise the first token that survives three filters wins: it must not be a
 * `FOO=bar` environment assignment, must not be a launcher, and must expand to
 * an absolute path.
 *
 * Existence is deliberately NOT a filter. Returning only paths that exist would
 * mean a registered-but-deleted recorder silently resolves to the documented
 * default — and if that default happens to exist, Doctor would report a healthy
 * script while the registered one is gone. That is the exact false-healthy
 * shape this command was written to eliminate, so a path that does not exist is
 * returned and reported as missing.
 */
function scriptFromCommand(command: string): string | undefined {
  for (const match of command.matchAll(/(=?)["']([^"']+)["']/g)) {
    // Skip the VALUE of an environment assignment. `env CONFIG="/tmp/config"
    // bash "$HOME/.../record-artifact.sh"` is a legal registration whose first
    // quoted absolute path is the config, not the recorder — and resolving to
    // it would make Doctor test the wrong file and report health for it.
    if (match[1] === "=") continue;
    const candidate = expandHome(match[2] ?? "");
    if (candidate.startsWith("/") && !LAUNCHERS.test(path.basename(candidate))) return candidate;
  }

  for (const token of command.trim().split(/\s+/)) {
    if (!token || token.includes("=")) continue;
    const candidate = expandHome(token.replace(/^["']|["']$/g, ""));
    if (!candidate.startsWith("/")) continue;
    if (LAUNCHERS.test(path.basename(candidate))) continue;
    return candidate;
  }

  return undefined;
}

/**
 * The interpreter a command runs its script through, if it names one.
 *
 * `env` is a PREFIX, not the interpreter — `env bash /path/rec.sh` runs bash.
 * Returning early on it loses the real launcher, and Doctor then demands an
 * execute bit the registration does not need. Skip past it and keep looking.
 *
 * The first token that is neither `env` nor an assignment decides: a launcher
 * means the script is interpreted, anything else means it is the script itself.
 */
function launcherFromCommand(command: string): string | undefined {
  for (const token of command.trim().split(/\s+/)) {
    if (!token || token.includes("=")) continue;
    const bare = path.basename(token.replace(/^["']|["']$/g, ""));
    if (bare === "env") continue;
    return LAUNCHERS.test(bare) ? bare : undefined;
  }
  return undefined;
}

/**
 * Absolute path to the registered recorder script, or the documented default.
 *
 * Doctor needs this so it can exercise the user's ACTUAL script rather than
 * assuming the documented location — testing the wrong file and reporting it
 * healthy is worse than not testing at all.
 */
export interface ResolvedHookScript {
  /** Absolute path to the script the registration points at. */
  path: string;
  /**
   * The interpreter the registration runs it through, if any.
   *
   * `bash /path/rec.sh` is a legal registration and needs no execute bit — bash
   * only has to READ the file. Losing this detail is what made Doctor demand
   * `chmod +x` on a recorder that was working fine, and then fail its own
   * self-test by trying to exec the script directly.
   */
  launcher?: string;
}

export async function resolveHookScript(): Promise<ResolvedHookScript> {
  for (const settingsPath of SETTINGS_PATHS) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(settingsPath, "utf8"));
    } catch {
      continue;
    }

    const command = artifactHookCommand(parsed);
    if (!command) continue;

    const script = scriptFromCommand(command);
    if (script) return { path: script, launcher: launcherFromCommand(command) };
  }

  // Nothing registered, or a command shaped in a way this cannot read (a
  // pipeline, a function call). The default is the honest guess, and the
  // self-test refuses to run anything whose index is not derived from $HOME.
  return { path: DEFAULT_HOOK_SCRIPT_PATH };
}

function hasKillSwitch(settings: unknown): boolean {
  if (typeof settings !== "object" || settings === null) return false;
  const s = settings as Record<string, unknown>;
  return HOOK_KILL_SWITCHES.some((key) => s[key] === true);
}

export async function readHookStatus(): Promise<HookStatus> {
  let readAny = false;
  let found = false;
  let killed = false;

  for (const settingsPath of SETTINGS_PATHS) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await readFile(settingsPath, "utf8"));
    } catch {
      // Missing is normal (not everyone has a local override) and malformed is
      // not ours to report. Either way this file yields no evidence.
      continue;
    }

    readAny = true;
    if (hasKillSwitch(parsed)) killed = true;
    if (hasArtifactHook(parsed)) found = true;
  }

  if (!readAny) return "unknown";
  // Order matters: a kill switch beats a registration, because the hook exists
  // and still will not run. Reporting "registered" here is the false-healthy
  // case this module exists to prevent.
  if (killed) return "disabled";
  return found ? "registered" : "missing";
}
