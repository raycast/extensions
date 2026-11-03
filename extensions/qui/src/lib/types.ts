export interface ProcessInfo {
  pid: number;
  ppid: number;
  /** Short executable name, e.g. `node`. */
  name: string;
  /** Full command line including arguments. */
  command: string;
  /** Path to the executable, when known. */
  executable?: string;
  /** Path to the containing `.app` bundle (macOS only), used for the icon. */
  appBundle?: string;
  user?: string;
  /** Working directory, when readable. */
  cwd?: string;
  /** Seconds since the process started. */
  elapsedSeconds?: number;
  /** Resident memory in kilobytes. */
  rssKb?: number;
  /** Parent chain from the root (e.g. launchd) down to this process's parent. */
  ancestry: { pid: number; name: string }[];
  git?: { root: string; branch?: string };
  /** Detected runtime and framework, used for icons. */
  stack?: Stack;
}

export interface StackItem {
  name: string;
  /** Asset name in assets/stack, without extension. */
  icon: string;
}

export interface Stack {
  runtime?: StackItem;
  framework?: StackItem;
}

export interface ListeningPort {
  /** Unique key: `${pid}:${port}`. */
  id: string;
  port: number;
  protocol: "TCP";
  /** Bind addresses, e.g. `127.0.0.1`, `*`, `[::1]`. */
  addresses: string[];
  process: ProcessInfo;
}
