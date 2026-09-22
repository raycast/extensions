import { homedir } from "node:os";
import { join } from "node:path";
import { expandHome } from "./config";
import { AgentId } from "./types";

/**
 * One descriptor per supported agent: where its data lives, how it is labelled, and how a
 * session is resumed. Adding an agent means one entry here plus a `SessionProvider`.
 *
 * `home` is the root directory the agent keeps its state in. It is also the auto-detection
 * signal: an agent whose home is missing is simply never discovered, so users only ever see
 * the agents they actually use and no preference toggling is required.
 */
export interface AgentDescriptor {
  id: AgentId;
  /** Display name, e.g. "Claude Code". */
  label: string;
  /** Bundled icon in assets/, used when the desktop app is not installed. */
  icon: string;
  /** Installed app bundles whose real icon we prefer over the bundled one, best first. */
  appBundles: string[];
  /** Desktop app that can open a session directly, when the agent has one. */
  app: { name: string; deepLink: (sessionId: string) => string } | null;
  /** Default CLI binary used to resume in a terminal. */
  command: string;
  /** Absolute paths tried when the binary is not on PATH. */
  commandFallbacks: string[];
  /** Terminal invocation resuming `sessionId` with `command` (already shell-safe). */
  resume: (command: string, sessionId: string) => string;
  /** Root directory of the agent's local state; `override` comes from preferences. */
  home: (override?: string) => string;
  /** Preference name overriding `home`, when one is exposed. */
  homePreference?: string;
  /** Preference name overriding `command`, when one is exposed. */
  commandPreference?: string;
}

function underHome(...parts: string[]): (override?: string) => string {
  return (override?: string) => (override?.trim() ? expandHome(override.trim()) : join(homedir(), ...parts));
}

/**
 * The XDG data directory. Several agents use it on macOS too rather than
 * ~/Library/Application Support, so this mirrors what their own code does.
 */
function underData(...parts: string[]): (override?: string) => string {
  const base = process.env.XDG_DATA_HOME?.trim() || join(homedir(), ".local", "share");
  return (override?: string) => (override?.trim() ? expandHome(override.trim()) : join(base, ...parts));
}

const APPLICATIONS = "/Applications";

export const AGENTS: AgentDescriptor[] = [
  {
    id: "claude",
    label: "Claude Code",
    icon: "claude.png",
    appBundles: [join(APPLICATIONS, "Claude.app")],
    app: { name: "Claude Desktop", deepLink: (id) => `claude://resume?session=${encodeURIComponent(id)}` },
    command: "claude",
    commandFallbacks: [join(homedir(), ".local", "bin", "claude"), "/opt/homebrew/bin/claude"],
    resume: (command, id) => `${command} --resume ${id}`,
    home: underHome(".claude"),
    homePreference: "claudeConfigDir",
    commandPreference: "claudeCommand",
  },
  {
    id: "codex",
    label: "Codex",
    icon: "codex.png",
    appBundles: [join(APPLICATIONS, "Codex.app"), join(APPLICATIONS, "ChatGPT.app")],
    app: { name: "Codex app", deepLink: (id) => `codex://threads/${encodeURIComponent(id)}` },
    command: "codex",
    // Codex desktop users often have no `codex` on PATH; the app bundles its own CLI.
    commandFallbacks: [join(APPLICATIONS, "ChatGPT.app", "Contents", "Resources", "codex")],
    resume: (command, id) => `${command} resume ${id}`,
    home: underHome(".codex"),
    homePreference: "codexHome",
    commandPreference: "codexCommand",
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: "cursor.png",
    appBundles: [join(APPLICATIONS, "Cursor.app")],
    app: null,
    command: "cursor-agent",
    commandFallbacks: [join(homedir(), ".local", "bin", "cursor-agent"), "/opt/homebrew/bin/cursor-agent"],
    resume: (command, id) => `${command} --resume ${id}`,
    home: underHome(".cursor"),
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    icon: "gemini.png",
    appBundles: [],
    app: null,
    command: "gemini",
    commandFallbacks: [],
    // --resume only sees the current project's sessions, so the cd into the session's cwd matters.
    resume: (command, id) => `${command} --resume ${id}`,
    home: underHome(".gemini"),
  },
  {
    id: "qwen",
    label: "Qwen Code",
    icon: "qwen.png",
    appBundles: [],
    app: null,
    command: "qwen",
    commandFallbacks: [],
    resume: (command, id) => `${command} --resume ${id}`,
    home: underHome(".qwen"),
  },
  {
    id: "copilot",
    label: "Copilot CLI",
    icon: "copilot.png",
    appBundles: [],
    app: null,
    command: "copilot",
    commandFallbacks: [],
    // --session-id resolves the id exactly; --resume also accepts prefixes and session names.
    resume: (command, id) => `${command} --session-id ${id}`,
    home: underHome(".copilot"),
  },
  {
    id: "opencode",
    label: "opencode",
    icon: "opencode.png",
    appBundles: [],
    app: null,
    command: "opencode",
    commandFallbacks: [],
    resume: (command, id) => `${command} --session ${id}`,
    home: underData("opencode"),
  },
  {
    id: "crush",
    label: "Crush",
    icon: "crush.png",
    appBundles: [],
    app: null,
    command: "crush",
    commandFallbacks: [],
    resume: (command, id) => `${command} --session ${id}`,
    home: underData("crush"),
  },
  {
    id: "goose",
    label: "Goose",
    icon: "goose.png",
    appBundles: [],
    app: null,
    command: "goose",
    commandFallbacks: [],
    resume: (command, id) => `${command} session --resume --session-id ${id}`,
    home: underData("goose"),
  },
  {
    id: "droid",
    label: "Droid",
    icon: "droid.png",
    appBundles: [],
    app: null,
    command: "droid",
    commandFallbacks: [],
    resume: (command, id) => `${command} --resume ${id}`,
    home: underHome(".factory"),
  },
];

const BY_ID = new Map<AgentId, AgentDescriptor>(AGENTS.map((a) => [a.id, a]));

export function agent(id: AgentId): AgentDescriptor {
  const a = BY_ID.get(id);
  if (!a) throw new Error(`Unknown agent ${id}`);
  return a;
}

export const AGENT_IDS: AgentId[] = AGENTS.map((a) => a.id);
