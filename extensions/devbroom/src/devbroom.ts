// Talks to Devbroom: its command for reading and cleaning, its links for the app.
// Cleaning always goes through `devbroom clean`, with the app's protections, and
// only for items someone ticked in Raycast and confirmed.
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { getPreferenceValues, open } from "@raycast/api";

export interface Summary {
  schema: number;
  at_ms: number;
  roots: string[];
  ready_bytes: number;
  ready_items: number;
  review_bytes: number;
  review_items: number;
  blocked_bytes: number;
  unknown_bytes: number;
  top: { path: string; kind: string; bytes: number }[];
}

function cli(): string {
  const { cli } = getPreferenceValues<Preferences>();
  const path = cli?.trim() || "~/.local/bin/devbroom";
  return path.startsWith("~/") ? homedir() + path.slice(1) : path;
}

/** The app's last scan, from `devbroom status --json`; it never scans. */
export function status(): Promise<Summary> {
  return new Promise((resolve, reject) => {
    execFile(cli(), ["status", "--json"], { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        const why = stderr
          .toString()
          .replace(/^devbroom:\s*/, "")
          .trim();
        reject(new Error(why || error.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout.toString()) as Summary);
      } catch {
        reject(new Error("devbroom status gave something unexpected"));
      }
    });
  });
}

/** `devbroom clean --json`: the plan, and with `--yes` what was done. */
export interface CleanReport {
  settings: "app" | "none";
  dry_run: boolean;
  delete_allowed?: boolean;
  planned: { path: string; kind?: string; bytes: number; method: string }[];
  left_out: { path: string; why: string }[];
  to_review: { path: string; why: string }[];
  outcomes: { target: string; status: string; message: string; freed_bytes: number }[];
}

/** `devbroom clean` exit codes that mean something to the person. */
const CLEAN_ERRORS: Record<number, string> = {
  3: "Nothing was changed",
  5: "Another cleanup is running; try again when it is done",
  6: "Your organization turned this off",
};

const PARTLY = 4;

/** One `--progress` line: a scan stage, an item judged, or an item being cleaned. */
export type Progress =
  | { stage: string }
  | { found: { path: string; bytes: number; ready: boolean; done: number; total: number } }
  | { cleaning: { path: string; done: number; total: number } };

export const STAGES: Record<string, string> = {
  agents: "Reading agent data",
  repositories: "Finding repositories and worktrees",
  git_status: "Checking git status",
  processes: "Looking at running processes",
  measuring: "Measuring folders",
  assessing: "Checking what is safe to clean",
  devices: "Looking at simulators and tools",
  planning: "Checking each item again",
};

interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (p: Progress) => void;
}

function cleanCommand(args: string[], { signal, onProgress }: RunOptions = {}): Promise<CleanReport> {
  return new Promise((resolve, reject) => {
    // A scan can take a minute or two; SIGINT lets it stop cleanly.
    const child = spawn(cli(), ["clean", "--json", "--progress", ...args], {
      signal,
      killSignal: "SIGINT",
      timeout: 15 * 60_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let pending = "";
    const said: string[] = [];
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => {
      pending += chunk.toString();
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("{")) {
          said.push(line);
          continue;
        }
        try {
          onProgress?.(JSON.parse(line) as Progress);
        } catch {
          said.push(line);
        }
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && code !== PARTLY) {
        const why = [...said, pending]
          .join("\n")
          .replace(/^devbroom:\s*/, "")
          .trim()
          .split("\n")[0];
        if (/unknown option: --(only|progress)/.test(why)) {
          reject(new Error("This needs a newer Devbroom; update it from the app"));
        } else {
          reject(new Error(why || CLEAN_ERRORS[code ?? -1] || "devbroom clean stopped"));
        }
        return;
      }
      try {
        resolve(JSON.parse(stdout) as CleanReport);
      } catch {
        reject(new Error("devbroom clean gave something unexpected"));
      }
    });
  });
}

/** What is Ready now: a fresh scan, nothing changed. */
export function preview(options?: RunOptions): Promise<CleanReport> {
  return cleanCommand(["--dry-run"], options);
}

/**
 * Cleans exactly these items, if they are still Ready: `--only` adds nothing
 * new, and what changed since the preview is left out with its reason.
 */
export function clean(paths: string[], forGood: boolean, options?: RunOptions): Promise<CleanReport> {
  const only = paths.flatMap((p) => ["--only", p]);
  return cleanCommand(["--yes", ...(forGood ? ["--delete"] : []), ...only], options);
}

export type Link = "open";

/** One of Devbroom's fixed links; nothing else is ever put in them. */
export function openLink(link: Link, tab?: "storage" | "worktrees" | "sessions" | "devices") {
  return open(tab ? `devbroom://${link}?tab=${tab}` : `devbroom://${link}`);
}

/** The folder an item is in, with the home folder written as ~. */
export function folder(path: string): string {
  const home = homedir();
  const parent = path.slice(0, path.lastIndexOf("/")) || "/";
  return parent === home || parent.startsWith(home + "/") ? "~" + parent.slice(home.length) : parent;
}

/** A size the way Finder writes it: GB, MB or KB. */
export function gb(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes > 0) return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  return "0 KB";
}
