import type { DeviceIcon } from "./devices";

/** One status record a program reported through Rex's Program Status Protocol (OSC 7501). */
export interface ProgramStatus {
  app: string;
  state: "idle" | "working" | "done" | "blocked" | "error" | string;
  kind?: "permission" | "question" | "auth" | string;
  msg?: string;
  title?: string;
  progress?: number;
  updatedAt?: string;
}

export interface BlockProcess {
  name?: string;
  argv0?: string;
  cwd?: string;
  pid?: number;
  /** Basename of the path the program was invoked through, such as `claude` for a versioned binary. */
  invoked?: string;
  /** Basename of the executable. */
  path?: string;
  /** Basename of the script an interpreter is running, when known. */
  script?: string;
}

/** A Rex server you connect to: this Mac, or a remote host from `rex hosts`. */
export interface RexHost {
  /** Label from `rex hosts`; empty for the local server. */
  label: string;
  endpoint?: string;
  thisMachine: boolean;
  /** Icon name chosen with `rex hosts add --icon`, such as `macbook` or `server.rack`. */
  icon?: string;
}

export const LOCAL_HOST: RexHost = { label: "", thisMachine: true };

export function hostDisplayName(host: RexHost): string {
  return host.thisMachine ? "This Mac" : host.label || host.endpoint || "Remote host";
}

/** The exact server selector passed to the CLI, or undefined for this Mac. */
export function serverTarget(host?: RexHost): string | undefined {
  return !host || host.thisMachine ? undefined : host.label || host.endpoint || undefined;
}

/** Which server a host entry connects to: this Mac, or the exact `-S` target `serverFlags` passes. */
export function hostKey(host: RexHost): string {
  return host.thisMachine ? "local" : `remote:${serverTarget(host) || ""}`;
}

/** A block is one application inside a window. Today that means a terminal. Rex's UI calls it a pane. */
export interface RexBlock {
  blockId: string;
  label: string;
  flavor: string;
  title?: string;
  process?: BlockProcess;
  status: ProgramStatus[];
}

/** A window is a tab inside a session. It holds a layout of blocks. Rex's UI calls it a tab. */
export interface RexWindow {
  windowId: string;
  label: string;
  active: boolean;
  focusedBlockId?: string;
  blocks: RexBlock[];
}

/** A session groups related work, such as one project, and stays alive on its server. */
export interface RexSession {
  sessionId: string;
  label: string;
  activeWindowId?: string;
  windows: RexWindow[];
  host: RexHost;
}

export interface HostError {
  host: RexHost;
  message: string;
}

export interface RexSnapshot {
  sessions: RexSession[];
  hosts: RexHost[];
  /** Hosts that could not be read this time, with the reason. */
  hostErrors: HostError[];
  /** Non-fatal problems hit while collecting, one line each. */
  warnings: string[];
  fetchedAt: string;
  /** SF Symbol name for this Mac, detected once per launch. */
  localDevice?: DeviceIcon;
}

/** Last six characters of an ID, which is how Rex prints short IDs. */
export function shortId(id: string): string {
  return id.slice(-6);
}

/** Rex IDs are unique per server, and two host entries may reach the same one, so list keys include the host. */
export function sessionKey(session: RexSession): string {
  return `${hostKey(session.host)}/${session.sessionId}`;
}

export function focusedBlock(window: RexWindow): RexBlock | undefined {
  return window.blocks.find((block) => block.blockId === window.focusedBlockId) ?? window.blocks[0];
}
