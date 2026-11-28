export interface RexSession {
  session_id: string;
  label: string;
}

/**
 * A Rex server this extension can show activity for, from the host registry or
 * the local server's status.
 */
export interface RexHost {
  /** A registry ID, or the local server's host ID or `local`. */
  id: string;
  label: string;
  /** Identifies the machine and account the server runs as. */
  host_id?: string;
  /** True for the Rex server on this Mac. */
  is_local: boolean;
}

export interface RexClientInfo {
  kind?: string;
  name?: string;
  label?: string;
}

export interface RexClient {
  client_id: string;
  info?: RexClientInfo;
  connection_state?: string;
}

export interface RexStatusOwner {
  name: string;
  pid: number;
}

/**
 * A status a program in a terminal reported through
 * `com.superlogical.terminal.program_status`.
 */
export interface RexStatusRecord {
  id?: string;
  state: string;
  kind?: string;
  progress?: number | null;
  app?: string;
  effective_app?: string;
  title?: string;
  msg?: string;
  updated_at: string;
  owner?: RexStatusOwner | null;
}

export interface RexProcessEntry {
  pid: number;
  user_id: number;
  name: string;
  user?: string;
  path?: string;
  invoked_path?: string;
  argv0?: string;
  script?: string;
  cwd?: string;
}

export interface RexExitStatus {
  exit_code: number;
  error?: string;
}

/**
 * The processes running in a terminal, from
 * `com.superlogical.terminal.process`.
 */
export interface RexProcessInfo {
  last_exit: RexExitStatus | null;
  child?: RexProcessEntry | null;
  foreground?: RexProcessEntry | null;
  ancestors?: RexProcessEntry[] | null;
  home?: string;
}

/**
 * A placed block in a Rex session, combined with the status and process
 * information the block reported. One activity is created per program-status
 * record, or one fallback activity per idle block with no records.
 */
export interface RexActivity {
  /** Stable composite of session, window, block, and status record. */
  id: string;
  session_id: string;
  session_label: string;
  window_id: string;
  window_label: string;
  block_id: string;
  block_label: string;
  creator_name?: string;
  flavor?: string;
  host_id?: string;
  owner?: string;
  status?: RexStatusRecord;
  process?: RexProcessInfo;
}
