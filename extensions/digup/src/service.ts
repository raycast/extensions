import { ChildProcessWithoutNullStreams, execFileSync, spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";

// A client for `digup search-service`: DigUp's searcher as a long-lived process (index open, encoder warm),
// spoken to in JSON lines. Responses carry the request's id and can come back out of order.

export type Kind = "screenshot" | "image" | "pdf" | "doc" | "audio" | "video" | "code";

export type Hit = {
  path: string;
  kind: Kind;
  segment: string;
  segment_id: number;
  loc?: number;
  loc_end?: number;
  excerpt?: string;
  z?: number;
  keyword_rank?: number;
  modified: number;
  size: number;
  info: Record<string, string>;
};

export type SearchResult = {
  hits: Hit[];
  strong?: number;
  meaning: boolean;
  warning?: string;
};
export type Status = {
  encoder?: string;
  vectors?: number;
  files?: number;
  searchable?: number;
  pending?: number;
};

type Pending = {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
};

const plist = join(homedir(), "Library/Preferences/com.abdurrahim.DigUp.plist");

/** DigUp's own folder choices, so results match what the app would show. */
function appList(key: string): string[] {
  try {
    const out = execFileSync("/usr/bin/plutil", ["-extract", key, "json", "-o", "-", plist], { encoding: "utf8" });
    const value = JSON.parse(out);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export class DigUpService {
  private child: ChildProcessWithoutNullStreams;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private dead?: Error;

  constructor(cli: string) {
    const args = ["search-service", ...appList("roots")];
    for (const folder of appList("excludedFolders")) args.push("--exclude", folder);
    this.child = spawn(cli, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.child.on("error", (error) => this.fail(error));
    this.child.on("exit", (code) => this.fail(new Error(`DigUp's search helper stopped (exit ${code ?? "?"})`)));
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      const id = message.id;
      if (typeof id !== "number") return; // events: "ready", "encoder"
      const waiter = this.pending.get(id);
      if (!waiter) return;
      this.pending.delete(id);
      if (typeof message.error === "string") waiter.reject(new Error(message.error));
      else waiter.resolve(message);
    });
    this.child.stderr.resume();
  }

  private fail(error: Error) {
    this.dead ??= error;
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
  }

  get alive() {
    return !this.dead;
  }

  private request<T>(op: string, fields: Record<string, unknown> = {}): Promise<T> {
    if (this.dead) return Promise.reject(this.dead);
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: Record<string, unknown>) => void,
        reject,
      });
      this.child.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
    });
  }

  prewarm() {
    return this.request<{ encoder?: string }>("prewarm");
  }

  status() {
    return this.request<Status>("status");
  }

  search(q: string, options: { kinds?: Kind[]; meaning: boolean; limit: number }) {
    return this.request<SearchResult>("search", {
      q,
      kinds: options.kinds,
      limit: options.limit,
      meaning: options.meaning,
      prefix_last: !options.meaning,
    });
  }

  embedAhead(q: string) {
    return this.request("embed_ahead", { q }).catch(() => undefined);
  }

  text(segment: number) {
    return this.request<{ text?: string }>("text", { segment }).then((r) => r.text ?? "");
  }

  render(path: string, kind: "pdf" | "video" | "image", loc: number | undefined, pixels: number) {
    return this.request<{ image?: string }>("render", {
      path,
      kind,
      loc,
      pixels,
    }).then((r) => r.image);
  }

  close() {
    if (this.dead) return;
    this.dead = new Error("closed");
    this.child.stdin.end(JSON.stringify({ id: 0, op: "quit" }) + "\n");
    setTimeout(() => this.child.kill(), 1500).unref();
  }
}
