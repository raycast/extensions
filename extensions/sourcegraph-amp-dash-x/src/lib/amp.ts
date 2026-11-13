import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

export const AMP_URL = "https://ampcode.com";

export type Thread = {
  id: string;
  title: string | null;
  updated: string;
  tree?: string;
  messageCount?: number;
};

export type LiveThread = {
  id: string;
  title: string | null;
  url: string;
  project: string;
  status: string;
  updatedAt: string;
  working: boolean;
  executorConnected: boolean;
};

export type Project = {
  id: string;
  name: string;
  namespace: string;
  description: string;
  repositoryURL: string;
};

type ExportedContent = { type: string; text?: string; name?: string };
export type ExportedMessage = {
  role: "user" | "assistant" | "info";
  content: ExportedContent[];
  state?: { type: string; stopReason?: string };
  createdAt?: string;
};
export type ExportedThread = { id: string; title?: string; messages: ExportedMessage[]; agentMode?: string };

export const threadURL = (id: string) => `${AMP_URL}/threads/${id}`;
export const projectSlug = (p: Pick<Project, "namespace" | "name">) => `${p.namespace}/${p.name}`;

const CANDIDATES = [
  join(homedir(), ".amp/bin/amp"),
  join(homedir(), ".local/bin/amp"),
  "/opt/homebrew/bin/amp",
  "/usr/local/bin/amp",
];

export function ampBinary(): string {
  const { ampBinaryPath } = getPreferenceValues<Preferences>();
  const configured = ampBinaryPath?.trim().replace(/^~(?=\/)/, homedir());
  if (configured?.includes("/")) return configured;
  const found = CANDIDATES.find((p) => existsSync(p));
  // A bare name such as `amp` (Amp Dash X's old default) is looked up on PATH as a last resort.
  if (!found && configured) return configured;
  if (!found) {
    throw new Error("Amp CLI not found. Install it from ampcode.com/install or set its path in preferences.");
  }
  return found;
}

function ampEnv(): NodeJS.ProcessEnv {
  const { accessToken } = getPreferenceValues<Preferences>();
  // Raycast starts extensions with a minimal PATH; the CLI shells out to git for some commands.
  const PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH].join(":");
  return { ...process.env, PATH, NO_COLOR: "1", ...(accessToken ? { AMP_API_KEY: accessToken } : {}) };
}

export function amp(args: string[], options: { timeout?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      ampBinary(),
      args,
      // Run from home so the CLI never infers a project from Raycast's working directory.
      { cwd: homedir(), env: ampEnv(), timeout: options.timeout ?? 60_000, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || stdout || error.message).trim().split("\n").filter(Boolean).pop();
          reject(new Error(detail ?? error.message));
        } else {
          resolve(stdout);
        }
      },
    );
    // In execute mode the CLI also reads the prompt from stdin and waits for it to close.
    child.stdin?.end();
  });
}

async function ampJSON<T>(args: string[]): Promise<T> {
  return JSON.parse(await amp(args)) as T;
}

export const listThreads = (limit = 100) => ampJSON<Thread[]>(["threads", "list", "--json", "--limit", String(limit)]);

export async function searchThreads(query: string, limit = 50): Promise<Thread[]> {
  const rows = await ampJSON<{ id: string; title: string | null; updatedAt: string }[]>([
    "threads",
    "search",
    query,
    "--json",
    "--limit",
    String(limit),
  ]);
  return rows.map((r) => ({ id: r.id, title: r.title, updated: r.updatedAt }));
}

export const listProjects = () => ampJSON<Project[]>(["projects", "list", "--json"]);

export const exportThread = (id: string) => ampJSON<ExportedThread>(["threads", "export", id]);

// The CLI prefixes YAML front matter, which Raycast would render as a heading.
export const threadMarkdown = async (id: string) =>
  (await amp(["threads", "markdown", id])).replace(/^---\n[\s\S]*?\n---\n/, "");

export const archiveThread = (id: string, unarchive = false) =>
  amp(["threads", "archive", id, ...(unarchive ? ["--unarchive"] : [])]);

export const renameThread = (id: string, title: string) => amp(["threads", "rename", id, title]);

export const usage = () => amp(["usage"]);

const lastURL = (out: string) => {
  const match = out.match(/https:\/\/\S+\/threads\/(T-[\w-]+)/g);
  if (!match) throw new Error(`Amp did not return a thread URL: ${out.trim().slice(0, 200)}`);
  return match[match.length - 1];
};

export type StartOptions = {
  prompt: string;
  project?: string;
  mode?: string;
  title?: string;
  orbSize?: string;
  fast?: boolean;
};

/** Starts an agent in a new orb thread and returns its URL as soon as the orb accepts it. */
export async function startThread(o: StartOptions): Promise<string> {
  const args = ["--execute", o.prompt, "--orb-execute", "--no-archive-after-execute"];
  if (o.project) args.push("--project", o.project);
  if (o.mode) args.push("--mode", o.mode);
  if (o.title) args.push("--title", o.title);
  if (o.orbSize) args.push("--orb-size", o.orbSize);
  if (o.fast) args.push("--fast");
  return lastURL(await amp(args, { timeout: 120_000 }));
}

/** Sends a message to an existing thread; it runs on that thread's own executor. */
export async function sendMessage(id: string, message: string): Promise<void> {
  await amp(["threads", "continue", id, "--orb-execute", "--execute", message], { timeout: 120_000 });
}

export async function newPuckConversation(): Promise<string> {
  const url = lastURL(await amp(["threads", "new", "--mode", "puck"]));
  return url.slice(url.lastIndexOf("/") + 1);
}

export async function latestPuckConversation(): Promise<string | undefined> {
  const [latest] = await searchThreads("puck:true author:me archived:false", 1);
  return latest?.id;
}

/**
 * Streams `amp top`, the live list of active threads. The first event is often an empty
 * placeholder sent before the server answers. Returns a function that stops the stream.
 */
export function watchLiveThreads(
  onThreads: (threads: LiveThread[]) => void,
  onEnd: (error?: Error) => void,
): () => void {
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(ampBinary(), ["top", "--stream-jsonl"], { cwd: homedir(), env: ampEnv() });
  } catch (error) {
    queueMicrotask(() => onEnd(error as Error));
    return () => undefined;
  }
  let buffer = "";
  let stderr = "";
  let stopped = false;
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line) as { threads: LiveThread[]; reconnecting?: boolean };
        if (!event.reconnecting) onThreads(event.threads);
      } catch {
        // ignore non-JSON lines
      }
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  child.on("error", (error) => !stopped && onEnd(error));
  child.on("exit", (code) => {
    if (!stopped) onEnd(code ? new Error(stderr.trim().split("\n").pop() || `amp top exited with ${code}`) : undefined);
  });
  return () => {
    stopped = true;
    child.kill();
  };
}

/** One snapshot of the live thread list, for menu bar commands that run on an interval. */
export function liveThreads(timeoutMs = 15_000): Promise<LiveThread[]> {
  return new Promise((resolve, reject) => {
    let latest: LiveThread[] | undefined;
    let placeholder = false; // seen the empty event the CLI prints before the server answers
    let quiet: NodeJS.Timeout | undefined;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      clearTimeout(quiet);
      stop();
      // Without the server's snapshot, report Amp as unavailable rather than guess "no threads",
      // so callers keep what they last saw.
      if (latest) resolve(latest);
      else reject(error ?? new Error("Amp didn't send the list of active threads in time."));
    };
    const timer = setTimeout(() => finish(), timeoutMs);
    const stop = watchLiveThreads((threads) => {
      // An empty first event is the placeholder sent before the server answers.
      if (!latest && !placeholder && !threads.length) {
        placeholder = true;
        return;
      }
      latest = threads;
      // Settle once the stream goes quiet.
      clearTimeout(quiet);
      quiet = setTimeout(() => finish(), 300);
    }, finish);
  });
}

/** Text of the last assistant message, when the agent has finished its turn. */
export function finishedReply(thread: ExportedThread): string | undefined {
  const last = thread.messages[thread.messages.length - 1];
  if (last?.role !== "assistant" || last.state?.type !== "complete" || last.state.stopReason !== "end_turn") {
    return undefined;
  }
  return textOf(last);
}

export const textOf = (m: ExportedMessage) =>
  m.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n\n");
