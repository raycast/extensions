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
function runsAnArtifactRecorder(hooks: unknown): boolean {
  if (!Array.isArray(hooks)) return false;

  return hooks.some(
    (hook: HookCommand) =>
      typeof hook?.command === "string" &&
      /artifact/i.test(hook.command) &&
      !/(?:^|[/\\\s'"])probe-artifact-hook\.sh\b/i.test(hook.command),
  );
}

function hasArtifactHook(settings: unknown): boolean {
  if (typeof settings !== "object" || settings === null) return false;

  const postToolUse = (settings as { hooks?: { PostToolUse?: unknown } }).hooks?.PostToolUse;
  if (!Array.isArray(postToolUse)) return false;

  return postToolUse.some(
    (entry: HookEntry) => matchesArtifactTool(entry?.matcher) && runsAnArtifactRecorder(entry?.hooks),
  );
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
