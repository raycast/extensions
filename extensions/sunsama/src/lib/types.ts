/** Shared domain types for the Sunsama extension (MCP backed). */

/** A subtask as entered in a form, before it is sent to Sunsama. */
export interface SubtaskInput {
  title: string;
}

/** A channel from the MCP channel search. */
export interface Channel {
  id: string;
  name: string;
  isCategory?: boolean;
  categoryName?: string | null;
}

/** Arguments for creating a task. */
export interface CreateTaskInput {
  /** Optional when a URL is given — Sunsama titles the task from the linked item. */
  title?: string;
  day: string; // YYYY-MM-DD
  notes?: string; // Markdown
  /** Channel name; the server assigns the closest match. */
  channel?: string;
  timeEstimate?: number; // minutes
  subtasks?: SubtaskInput[];
  /** A link to natively attach (Trello/GitHub/Todoist/ClickUp/… or any web page). */
  url?: string;
  position?: "top" | "bottom";
}

/** A subtask in the UI. */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  timeEstimate?: number; // minutes
  /** Whether this subtask is the one the active timer is running on. */
  isRunning: boolean;
  /**
   * ISO start of the running session — only set when the server actually
   * reports one, so the elapsed display is never invented.
   */
  timerStart?: string;
}

/** A task in the UI, projected from the MCP task JSON. */
export interface Task {
  id: string;
  title: string;
  /** Notes converted from Sunsama's HTML to Markdown. */
  notes?: string;
  completed: boolean;
  timeEstimate?: number; // minutes
  channelName?: string;
  /** Openable URL of the task's integration (Trello/GitHub/ClickUp/…), if any. */
  integrationUrl?: string;
  /** The integration's service name (e.g. "trello", "github"), if any. */
  integrationService?: string;
  subtasks: Subtask[];
  /** Whether a timer is running on this task or any of its subtasks. */
  isRunning: boolean;
  /**
   * ISO start of the running session, when the server reports one. Drives the
   * live ticking display; absent means "running, but elapsed is unknown".
   */
  timerStart?: string;
  /** Seconds already tracked on the task (from Sunsama's reported total). */
  trackedSeconds: number;
  /** Whether the task's *own* timer is running (drives the Start/Stop action). */
  ownTimerRunning: boolean;
  /** Display start time of the task's earliest calendar slot, e.g. "9:30 AM". */
  startTime?: string;
}
