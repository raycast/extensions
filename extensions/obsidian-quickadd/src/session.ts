import { CliFailure, runCli } from "./cli";
import { QaPrompt } from "./replies";

export interface SessionInfo {
  port: number;
  sessionId: string;
  token: string;
}

export interface DoneResult {
  ok?: boolean;
  verified?: boolean;
  effect?: string;
  file?: string;
}

export type PromptEvent = { kind: "prompt"; requestId: string; prompt: QaPrompt };
export type SessionEvent = PromptEvent | { kind: "done"; result: DoneResult } | { kind: "error"; error: string };

/** Client for QuickAdd's interactive server: long-poll for events, reply to prompts, abort. */
export class InteractiveSession {
  private stopped = false;
  /** QuickAdd itself ended the run (done or error), so there is nothing to abort. */
  private ended = false;
  private abortSent = false;

  constructor(private readonly info: SessionInfo) {}

  get finished(): boolean {
    return this.stopped;
  }

  private url(path: string): string {
    const { port, sessionId, token } = this.info;
    return `http://127.0.0.1:${port}${path}?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
  }

  /** Polls until done/error/abort. Runs independently of the UI so QuickAdd's watchdog never fires. */
  async pollLoop(onEvent: (event: SessionEvent) => void): Promise<void> {
    while (!this.stopped) {
      let event: { kind?: unknown; error?: unknown; ok?: unknown };
      try {
        const response = await fetch(this.url("/poll"));
        event = (await response.json()) as typeof event;
      } catch (error) {
        if (this.stopped) return;
        this.stopped = true;
        onEvent({ kind: "error", error: `Lost connection to QuickAdd: ${(error as Error).message}` });
        return;
      }
      if (this.stopped) return;
      if (event.kind === "prompt") {
        onEvent(event as PromptEvent);
        continue;
      }
      if (event.kind === "done") {
        this.stopped = this.ended = true;
        onEvent(event as SessionEvent);
        return;
      }
      if (event.kind === "error" || typeof event.error === "string" || event.ok === false) {
        this.stopped = this.ended = true;
        onEvent({
          kind: "error",
          error: typeof event.error === "string" ? event.error : "QuickAdd reported an error.",
        });
        return;
      }
      // "idle", or an event kind a newer QuickAdd added: keep polling.
    }
  }

  async reply(requestId: string, value: unknown): Promise<void> {
    const response = await fetch(this.url("/reply"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, value }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: unknown };
      throw new Error(
        typeof body.error === "string" ? body.error : `QuickAdd rejected the answer (HTTP ${response.status})`,
      );
    }
  }

  /** Ends the run in QuickAdd unless QuickAdd already ended it; safe to call more than once. */
  async abort(): Promise<void> {
    this.stopped = true;
    if (this.ended || this.abortSent) return;
    this.abortSent = true;
    try {
      await fetch(this.url("/abort"), { method: "POST" });
    } catch {
      // The session is already gone.
    }
  }
}

export type StartResult =
  { ok: true; session: InteractiveSession } | { ok: false; reason: CliFailure | "quickadd-error"; message: string };

export async function startSession(cli: string, vaultName: string, choiceId: string): Promise<StartResult> {
  const result = await runCli(cli, vaultName, "quickadd:interactive", [`id=${choiceId}`]);
  if (result.kind === "failure") return { ok: false, reason: result.reason, message: result.message };
  const data = result.data as { ok?: unknown; error?: unknown; port?: unknown; sessionId?: unknown; token?: unknown };
  if (
    data.ok !== true ||
    typeof data.port !== "number" ||
    typeof data.sessionId !== "string" ||
    typeof data.token !== "string"
  ) {
    const message = typeof data.error === "string" ? data.error : "QuickAdd did not start an interactive session.";
    return { ok: false, reason: "quickadd-error", message };
  }
  return {
    ok: true,
    session: new InteractiveSession({ port: data.port, sessionId: data.sessionId, token: data.token }),
  };
}

/** The prompt queue without the prompt that was just answered. */
export function withoutPrompt(queue: PromptEvent[], requestId: string): PromptEvent[] {
  return queue.filter((event) => event.requestId !== requestId);
}

export function doneMessage(choiceName: string, result: DoneResult): string {
  if (result.file && result.effect === "created") return `Created ${result.file}`;
  if (result.file && result.effect === "changed") return `Added to ${result.file}`;
  return `Ran ${choiceName}`;
}
