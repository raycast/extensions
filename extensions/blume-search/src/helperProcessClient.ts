import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import type { BlumeHelperLaunch } from "./helperLaunch.ts";
import {
  parseSearchResponse,
  RAYCAST_SEARCH_MAX_REQUEST_BYTES,
  RAYCAST_SEARCH_PROTOCOL_VERSION,
  type GlobalSearchCategory,
  type GlobalSearchPage,
  type SearchRequest,
} from "./protocol.ts";

const RESPONSE_TIMEOUT_MS = 5_000;
const READY_HANDSHAKE_GRACE_MS = 500;
const MAX_RESPONSE_BUFFER_BYTES = 2 * 1024 * 1024;

export interface SearchInput {
  query: string;
  categories: GlobalSearchCategory[];
}

interface PendingSearch {
  id: number;
  resolve(page: GlobalSearchPage): void;
  reject(error: Error): void;
  timeout: ReturnType<typeof setTimeout>;
}

export class SearchSupersededError extends Error {
  constructor() {
    super("Search superseded");
    this.name = "SearchSupersededError";
  }
}

export class BlumeSearchClient {
  readonly deepLinkProtocol: "blume" | "blume-canary";
  private readonly child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending: PendingSearch | null = null;
  private stdoutBuffer = "";
  private stderrBuffer = "";
  private disposed = false;
  private terminalError: Error | null = null;
  private readonly readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readySettled = false;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(launch: BlumeHelperLaunch, deepLinkProtocol: "blume" | "blume-canary" = "blume") {
    this.deepLinkProtocol = deepLinkProtocol;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.child = spawn(launch.command, launch.args, {
      env: launch.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.receive(chunk));
    this.child.stderr.on("data", (chunk: string) => {
      this.stderrBuffer = `${this.stderrBuffer}${chunk}`.slice(-2_000);
    });
    this.child.stdin.on("error", (error) => {
      if (!this.disposed) this.fail(error);
    });
    this.child.once("error", (error) => this.fail(error));
    this.child.once("exit", (code) => {
      if (this.disposed) return;
      const detail = this.stderrBuffer.trim();
      this.fail(new Error(detail || `Blume search helper exited${code === null ? "" : ` with code ${code}`}.`));
    });
    this.readyTimer = setTimeout(() => {
      if (this.readySettled) return;
      // Helpers released before the additive ready frame still speak protocol v1 and wait for a request.
      this.readySettled = true;
      this.resolveReady();
    }, READY_HANDSHAKE_GRACE_MS);
    this.readyTimer.unref?.();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  search(input: SearchInput): Promise<GlobalSearchPage> {
    if (this.disposed) return Promise.reject(this.terminalError ?? new Error("Blume search helper is closed."));
    if (this.pending) this.settle(this.pending, { error: new SearchSupersededError() });
    const id = this.nextId++;
    const request: SearchRequest = {
      version: RAYCAST_SEARCH_PROTOCOL_VERSION,
      type: "search",
      id,
      query: input.query,
      categories: input.categories,
    };
    const serializedRequest = JSON.stringify(request);
    if (Buffer.byteLength(serializedRequest, "utf8") > RAYCAST_SEARCH_MAX_REQUEST_BYTES) {
      return Promise.reject(new Error("Blume search request is too large."));
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pending?.id !== id) return;
        this.fail(new Error("Blume search timed out."));
      }, RESPONSE_TIMEOUT_MS);
      this.pending = { id, resolve, reject, timeout };
      this.child.stdin.write(`${serializedRequest}\n`, (error) => {
        if (error && this.pending?.id === id) this.fail(error);
      });
    });
  }

  dispose(): void {
    if (this.disposed) return;
    if (!this.readySettled) {
      this.readySettled = true;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      this.rejectReady(new Error("Blume search helper was closed before it started."));
    }
    this.disposed = true;
    if (this.pending) this.settle(this.pending, { error: new Error("Search closed.") });
    this.child.stdin.end();
    this.child.kill();
  }

  private receive(chunk: string): void {
    this.stdoutBuffer += chunk;
    let newline = this.stdoutBuffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.stdoutBuffer.slice(0, newline);
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      this.receiveLine(line);
      newline = this.stdoutBuffer.indexOf("\n");
    }
    if (Buffer.byteLength(this.stdoutBuffer, "utf8") > MAX_RESPONSE_BUFFER_BYTES) {
      this.fail(new Error("Blume search returned too much data."));
    }
  }

  private receiveLine(line: string): void {
    let response;
    try {
      response = parseSearchResponse(line);
    } catch {
      this.fail(new Error("Blume search returned an invalid response."));
      return;
    }
    if (response.type === "ready") {
      if (this.readySettled) return;
      if (!response.supportedVersions.includes(RAYCAST_SEARCH_PROTOCOL_VERSION)) {
        this.fail(new Error("Update Blume or this extension to a compatible search version."));
        return;
      }
      this.readySettled = true;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      this.resolveReady();
      return;
    }
    if (!this.pending || response.id !== this.pending.id) return;
    if (response.ok) this.settle(this.pending, { page: response.page });
    else this.settle(this.pending, { error: new Error(response.error) });
  }

  private settle(pending: PendingSearch, outcome: { page: GlobalSearchPage } | { error: Error }): void {
    clearTimeout(pending.timeout);
    if (this.pending === pending) this.pending = null;
    if ("page" in outcome) pending.resolve(outcome.page);
    else pending.reject(outcome.error);
  }

  private fail(error: Error): void {
    this.terminalError = error;
    if (!this.readySettled) {
      this.readySettled = true;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      this.rejectReady(error);
    }
    if (this.pending) this.settle(this.pending, { error });
    if (!this.disposed) {
      this.disposed = true;
      this.child.kill();
    }
  }
}
