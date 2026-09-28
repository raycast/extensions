// PURE: types for the agent level. An agent is an AI agent (a Claude Code session, a Cursor agent, a Codex CLI...)
// with a status, and a *host*: where it runs. It isn't a place of its own: its host points into the place level
// (a terminal process found by tty, a tab the tab level lists), and jumping to it selects that tab and pane with
// the tab's own source. Only agents no tab source knows (Cursor, Codex app) are opened by link (ADR-022, ADR-028).
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
}

/** Where an agent runs, as its source knows it. locate.ts resolves it to a Location. */
export type Host =
  /** A process with a terminal: found by its tty in a terminal app's panes, or at least its app. */
  | { kind: "process"; pid: number; tty: string }
  /**
   * A tab the tab level lists (a Claude Code session in the Claude app, a herdr tab), by its key, and the pane in
   * it. The tab's source selects it, so nothing about the app is repeated here.
   */
  | {
      kind: "place";
      tabKey: string;
      /** Pane of the tab (TabSource.selectPane), e.g. the herdr pane the agent runs in. */
      paneId?: string;
      /** App showing the tab, whose tabs locate.ts reads; undefined when unknown (herdr with no client in an app). */
      bundleId?: string;
      /** Shown in the list, before the app's name: "herdr › api". Default: the app's name. */
      label?: string;
      /** Opens the place without reading the app's tabs (a deep link); then the tab is only matched if already read. */
      url?: string;
    }
  /** Opened by URL with an app, for agents no tab source lists (Cursor, the Codex app). */
  | { kind: "link"; bundleId: string; url: string; label?: string };

/** Where to jump for an agent: the app to bring forward and what to select or open in it. */
export interface Location {
  app: App;
  /** Shown in the list: "iTerm", "cmux › hopper", "Claude". */
  label: string;
  /** Selected with its source, with `paneId` if given. */
  tab?: Tab;
  paneId?: string;
  /** Opened with the app when there's no tab. */
  url?: string;
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
