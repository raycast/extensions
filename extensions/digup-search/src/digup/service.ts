import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
// Node's own timers, by name: with the DOM library also in scope, the global ones are typed as returning a number.
import { clearTimeout, setTimeout } from "node:timers";
import type { Launch } from "./installation";
import { indexRevision } from "./index-revision";
import { parseLine, parseSearchReply, ServiceError, type SearchReply, type ServiceEvent } from "./protocol";

/** As much of a child process as the service uses, so tests can stand in for the helper. */
export interface ChildLike {
  stdin: { write(chunk: string): unknown; end(): unknown };
  stdout: { on(event: "data", listener: (chunk: Buffer | string) => void): unknown };
  stderr: { on(event: "data", listener: (chunk: Buffer | string) => void): unknown };
  on(event: "exit" | "error", listener: (...args: unknown[]) => void): unknown;
  kill(): unknown;
}

export type Spawner = (launch: Launch) => ChildLike;

export const spawnHelper: Spawner = (launch) => {
  const child = spawn(launch.program, launch.args, {
    env: { ...process.env, ...launch.env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  // A helper that ended leaves a closed pipe: writing to it must not take the extension down with it.
  child.stdin.on("error", () => undefined);
  return child;
};

export interface SearchParams {
  q: string;
  code: boolean;
  /** False: words only, the last one as a prefix (what's shown while typing). */
  meaning: boolean;
  kinds?: string[];
}

export interface ServiceOptions {
  /** Read the state of the SQLite files. Tests can supply an index revision without disk access. */
  readIndexRevision?: (launch: Launch) => Promise<string | undefined>;
  spawner?: Spawner;
  onEvent?: (event: ServiceEvent) => void;
  /** The helper ended by itself and another was started in its place; its `ready` event follows. */
  onRestart?: () => void;
  /** The helper ended by itself for the second time and won't be started again. `log`: the end of its stderr. */
  onFailed?: (log: string) => void;
  killAfterMs?: number;
  timeouts?: { request?: number; render?: number };
}

interface Waiting {
  resolve(body: Record<string, unknown>): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * `digup search-service` as a process: a JSON request per line in, the reply on a line out with the request's id;
 * lines without an id are events (DigUp's SearchService.swift has the protocol).
 */
export class DigUpService {
  private child: ChildLike | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Waiting>();
  private decoder = new StringDecoder("utf8");
  private buffer = "";
  private log = "";
  private stopping = false;
  private restarts = 0;
  private failed = false;
  /** The warm-up (`prewarm`) is under way: the helper answers nothing else until the model and the vectors are in. */
  private warming = false;
  private revision: string | undefined;
  private refreshing: Promise<void> | undefined;

  constructor(
    private readonly launch: Launch,
    private readonly options: ServiceOptions = {},
  ) {}

  start(): void {
    if (this.child || this.failed) return;
    this.stopping = false;
    this.buffer = "";
    this.decoder = new StringDecoder("utf8");
    const child = (this.options.spawner ?? spawnHelper)(this.launch);
    this.child = child;
    // Chunks end where the pipe says, which can be inside a character: the decoder holds the pieces.
    child.stdout.on("data", (chunk) => this.read(typeof chunk === "string" ? chunk : this.decoder.write(chunk)));
    child.stderr.on("data", (chunk) => {
      this.log = (this.log + String(chunk)).slice(-4000);
    });
    child.on("exit", () => this.ended(child));
    child.on("error", (error) => {
      this.log = `${this.log}\n${error instanceof Error ? error.message : String(error)}`.slice(-4000);
      this.ended(child);
    });
  }

  /** Asks the helper to quit and closes its input (it ends on either); ends it if it's still there after a second. */
  stop(): void {
    this.stopping = true;
    const child = this.child;
    if (!child) return;
    try {
      child.stdin.write(JSON.stringify({ id: this.nextId++, op: "quit" }) + "\n");
      child.stdin.end();
    } catch {
      // Its input is closed already: it is on its way out.
    }
    const timer = setTimeout(() => {
      if (this.child === child) child.kill();
    }, this.options.killAfterMs ?? 1000);
    timer.unref();
  }

  request(body: Record<string, unknown>, timeoutMs: number, restartOnTimeout = true): Promise<Record<string, unknown>> {
    const child = this.child;
    if (!child) return Promise.reject(new ServiceError("DigUp's search helper isn't running.", "exited"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const expire = () => {
        // The helper answers one request at a time, and the warm-up of a big index can take longer than this:
        // a request waiting behind it is slow, not stuck. Its time starts over until the warm-up has answered.
        if (this.warming && body.op !== "prewarm" && this.child === child) {
          waiting.timer = setTimeout(expire, timeoutMs);
          return;
        }
        this.pending.delete(id);
        reject(new ServiceError("DigUp took too long to answer.", "timeout"));
        // No answer in this long means the helper is stuck: its exit starts the next one.
        if (restartOnTimeout && this.child === child) child.kill();
      };
      const waiting: Waiting = { resolve, reject, timer: setTimeout(expire, timeoutMs) };
      this.pending.set(id, waiting);
      try {
        child.stdin.write(JSON.stringify({ id, ...body }) + "\n");
      } catch {
        // The exit that follows fails this request.
      }
    });
  }

  async search(params: SearchParams): Promise<SearchReply> {
    // DigUp updates the on-disk index while this helper keeps a vector snapshot in memory.
    // Refresh before a settled query if a database or WAL changed. Keyword searches still run while typing.
    if (params.meaning && (this.options.readIndexRevision || this.launch.args.includes("--index"))) {
      await this.refreshIndex();
    }
    const body: Record<string, unknown> = {
      op: "search",
      q: params.q,
      code: params.code,
      meaning: params.meaning,
      limit: 40,
    };
    if (!params.meaning) body.prefix_last = true;
    if (params.kinds?.length) body.kinds = params.kinds;
    return parseSearchReply(await this.request(body, this.options.timeouts?.request ?? 10_000));
  }

  private async refreshIndex(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const child = this.child;
    const refresh = async () => {
      const revision = await (this.options.readIndexRevision ?? indexRevision)(this.launch);
      if (child !== this.child) throw new ServiceError("DigUp's search helper stopped.", "exited");
      if (revision === undefined || revision === this.revision) return;
      const reply = await this.request({ op: "reload" }, this.options.timeouts?.request ?? 10_000);
      if (reply.ok === false) {
        throw new ServiceError(
          typeof reply.error === "string" ? reply.error : "DigUp could not refresh its index.",
          "request",
        );
      }
      this.revision = revision;
    };
    const task = refresh();
    this.refreshing = task;
    try {
      await task;
    } finally {
      if (this.refreshing === task) this.refreshing = undefined;
    }
  }

  /** Embeds the text typed so far, so the vector is ready when typing pauses. */
  embedAhead(q: string, code: boolean): void {
    this.request({ op: "embed_ahead", q, code }, this.options.timeouts?.request ?? 10_000).catch(() => undefined);
  }

  /** The part of a file a hit points at: a page's text, a passage, a stretch of code. Null when it has none. */
  async text(segmentId: number, code: boolean): Promise<string | null> {
    const body = await this.request({ op: "text", segment: segmentId, code }, this.options.timeouts?.request ?? 10_000);
    return typeof body.text === "string" ? body.text : null;
  }

  /** A JPEG of a PDF's page `loc`, a video's frame at `loc` seconds, or a picture: the path of the file. */
  async render(
    path: string,
    kind: "pdf" | "video" | "image",
    loc: number | undefined,
    pixels: number,
  ): Promise<string> {
    const request: Record<string, unknown> = { op: "render", path, kind, pixels };
    if (loc !== undefined) request.loc = loc;
    // Previews are made beside the request loop, so a slow one doesn't mean the helper is stuck.
    const body = await this.request(request, this.options.timeouts?.render ?? 15_000, false);
    if (typeof body.image !== "string") {
      throw new ServiceError(
        typeof body.error === "string" ? body.error : "DigUp could not make a preview.",
        "request",
      );
    }
    return body.image;
  }

  private read(text: string): void {
    this.buffer += text;
    for (let newline = this.buffer.indexOf("\n"); newline >= 0; newline = this.buffer.indexOf("\n")) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (line.trim()) this.handle(line);
    }
  }

  private handle(line: string): void {
    const parsed = parseLine(line);
    if (parsed.type === "reply") {
      const waiting = this.pending.get(parsed.id);
      if (!waiting) return;
      this.pending.delete(parsed.id);
      clearTimeout(waiting.timer);
      waiting.resolve(parsed.body);
    } else if (parsed.type === "event") {
      // Loading the model takes most of a second: it starts now, while the first words are typed.
      if (parsed.event.event === "ready") {
        this.warming = true;
        const warm = () => {
          this.warming = false;
        };
        this.request({ op: "prewarm" }, 60_000, false).then(warm, warm);
      }
      this.options.onEvent?.(parsed.event);
    }
  }

  private ended(child: ChildLike): void {
    if (this.child !== child) return;
    this.child = undefined;
    this.warming = false;
    this.revision = undefined;
    this.refreshing = undefined;
    for (const waiting of this.pending.values()) {
      clearTimeout(waiting.timer);
      waiting.reject(new ServiceError("DigUp's search helper stopped.", "exited"));
    }
    this.pending.clear();
    if (this.stopping) return;
    if (this.restarts < 1) {
      this.restarts += 1;
      this.start();
      this.options.onRestart?.();
      return;
    }
    this.failed = true;
    this.options.onFailed?.(this.log.trim());
  }
}
