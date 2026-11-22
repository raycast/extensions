import { AgentEvent, Config, Host, Session } from "../types";
import { SourceCapabilities } from "../sources/types";

export interface FileChange {
  path: string;
  /** Current content ("" when the file does not exist). */
  before: string;
  after: string;
  /** Short human-readable description of what changes in this file. */
  summary: string;
  /** Excerpt shown to the user before writing (only the parts this extension owns). */
  preview: string;
  previewLang: "json" | "toml" | "text";
}

export interface InstallPlan {
  changes: FileChange[];
  notes: string[];
}

export interface HookContext {
  /** Absolute path of node used to run the CLI. */
  node: string;
  /** Absolute path of the installed CLI. */
  cli: string;
}

export interface DetectResult {
  /** The agent is present on this machine. */
  present: boolean;
  /** Hooks written by this extension are in place. */
  hooked: boolean;
  hosts: Host[];
}

export type JumpMethod = "url" | "tmux" | "tab" | "activate" | "resume" | "copied" | "none";

export interface JumpResult {
  ok: boolean;
  method: JumpMethod;
}

/**
 * One adapter per agent declares the four things the manager needs:
 * detect, install hooks, locate a session (turn hook payloads into events), jump back.
 * The setup panel is generated from the adapter list, so a new agent only adds an adapter.
 */
export interface Adapter {
  id: string;
  name: string;
  /** Raycast asset for the logo. */
  icon?: string;
  source?: SourceCapabilities;
  detect(): DetectResult;
  planInstall(ctx: HookContext): InstallPlan;
  planUninstall(): InstallPlan;
  /** Map a raw hook invocation to an event. Return null to ignore it. */
  parseHook?(kind: string, payload: Record<string, unknown>, env: NodeJS.ProcessEnv): AgentEvent | null;
  jump(session: Session, config: Config): Promise<JumpResult>;
}

/** Marker used to recognise entries written by this extension. */
export const HOOK_MARKER = "agent-inbox.mjs";
