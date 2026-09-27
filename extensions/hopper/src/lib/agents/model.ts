// PURE: types for the agent level. An agent is an AI agent (a Claude Code session, a Cursor agent, a Codex CLI...)
// with a status, and a *host*: where it runs. It isn't a place of its own; jumping to it goes to its host: a
// terminal pane, a herdr pane, a desktop app's deep link (ADR-022).
//
// A *source* knows one family of agents (sources/, listed in registry.ts). Sources report what the agent's own
// files, processes, or APIs say; locate.ts then ties each host to the app and tab it's in, and status.ts turns
// "idle" into "done" until the user has seen it.

import type { App, Platform, Process } from "../platform/model";
import type { Tab } from "../tabs/model";

/**
 * - blocked: waiting on the user (a permission prompt, a question).
 * - working: running a turn.
 * - done: finished a turn the user hasn't looked at yet (status.ts).
 * - idle: finished and seen, or waiting for a new prompt.
 * - unknown: running, but its state can't be read (CLIs without a status file).
 */
export type AgentStatus = "blocked" | "working" | "done" | "idle" | "unknown";

export interface Agent {
  /** `<source>:<id>`, unique and stable while the agent exists. */
  key: string;
  /** Id of the AgentSource that produced it. */
  source: string;
  /** What kind of agent: "Claude Code", "Cursor", "Codex"... */
  product: string;
  /** The agent's own session or thread id. */
  id: string;
  title: string;
  /** Working folder, for its project. */
  cwd?: string;
  status: AgentStatus;
  /** Why it's blocked or how it ended: "Approve Bash", "Needs input", "Failed". */
  statusDetail?: string;
  /** When the status last changed, ms since 1970. */
  since?: number;
  /** Last time it did something (ended a turn), for telling done from idle. */
  activeAt?: number;
  /** Last time the user looked at it, if its own app records that (Claude's lastFocusedAt). */
  seenAt?: number;
  host: Host;
  /** Shell command that resumes this session in a new terminal, offered as a copy action. */
  resumeCommand?: string;
  /** Session ids another source may report for the same agent (herdr knows the Claude session in a pane). */
  sessionIds?: string[];
  /** Key of the Tab that shows this agent, when its host is a link (a Claude Code session or herdr tab listed by Search). */
  placeKey?: string;
}

/** Where an agent runs, as its source knows it. locate.ts resolves it to a Location. */
export type Host =
  /** A process with a terminal: found by its tty in a terminal app's panes, or at least its app. */
  | { kind: "process"; pid: number; tty: string }
  /** Opened by URL (or a folder) with an app: desktop agents. */
  | { kind: "link"; bundleId: string; url: string; label?: string }
  /** A pane of a herdr session, focused through its socket; the terminal running herdr comes forward. */
  | { kind: "herdr"; socket: string; paneId: string; label: string };

/** Where to jump for an agent: the app to bring forward and what to select or open in it. */
export interface Location {
  app: App;
  /** Shown in the list: "iTerm", "cmux › hopper", "Claude". */
  label: string;
  tab?: Tab;
  paneId?: string;
  url?: string;
  herdr?: { socket: string; paneId: string };
}

export interface LocatedAgent extends Agent {
  /** Undefined when the host couldn't be found (e.g. its terminal isn't a supported app). */
  location?: Location;
}

/** What sources get: the running apps and processes, read once and shared. */
export interface AgentContext {
  platform: Platform;
  apps: App[];
  processes: Process[];
  now: number;
}

export interface AgentSource {
  id: string;
  /** Agents this source knows about right now. Reject only on unexpected errors; missing data means []. */
  list(context: AgentContext): Promise<Agent[]>;
}
