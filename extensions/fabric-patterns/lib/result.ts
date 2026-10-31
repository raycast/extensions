// The Result view's state, kept pure so ISC-21 is bun-testable: what ↵ does,
// and what the view shows for a running, finished, failed or stopped run.

import type { RunResult } from "./runner";

export type RunStatus = "running" | "done" | "failed" | "stopped";

export function statusOf(r: RunResult | undefined): RunStatus {
  if (!r) return "running";
  if (r.aborted) return "stopped";
  return r.code === 0 ? "done" : "failed";
}

/** Whether fabric printed anything worth keeping: the one test ↵, the view and the Stopped toast share. */
const hasAnswer = (text: string) => text.trim() !== "";

/** ↵ stops a running run and copies a finished or stopped one. */
export function primaryAction(status: RunStatus, text: string): "stop" | "copy" | "none" {
  if (status === "running") return "stop";
  return hasAnswer(text) ? "copy" : "none";
}

/** The Stopped toast's message; resultMarkdown shows the same words when nothing arrived. */
export function stoppedMessage(text: string): string {
  return hasAnswer(text) ? "The partial answer stays here." : "Nothing arrived before the stop.";
}

/** Sent when the view closes on a run still going: its cleanup stops fabric, so the answer is gone. */
export function unmountNotice(name: string): string {
  return `Stopped: ${name}. Its Result view closed before it finished. To keep a long run going, use ⌘↵ › Run in Background.`;
}

export function statusLabel(status: RunStatus, elapsedSec: number): string {
  const t = `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")}`;
  return { running: `Running ${t}`, done: `Done in ${t}`, failed: "Failed", stopped: `Stopped at ${t}` }[status];
}

export function resultMarkdown(
  status: RunStatus,
  text: string,
  r?: RunResult,
  state: { title: string; description?: string } = { title: "fabric failed" },
  /** What a running run with no answer yet says, e.g. a chain's "Step 1/3 summarize running…". */
  waiting = "Waiting for fabric…",
  /** A line shown above a finished answer, e.g. how to read a chain's preview. */
  lead?: string,
): string {
  if (status === "failed") {
    const why = (r?.stderr || r?.error || `fabric exited ${r?.code}`).trim();
    const lead = state.description ? `\n\n${state.description}` : "";
    return `## ${state.title}${lead}\n\n\`\`\`\n${why}\n\`\`\`${text ? `\n\n${text}` : ""}`;
  }
  if (status === "stopped")
    return hasAnswer(text)
      ? `${text}\n\n---\n\n**Stopped.** This is the partial answer.`
      : `**Stopped.** ${stoppedMessage(text)}`;
  if (status === "running" && !text) return `_${waiting}_`;
  return status === "done" && lead ? `${lead}\n\n${text}` : text;
}

/** The argv as a copyable shell command, each element single-quoted where needed. */
export function shellCommand(fabricPath: string, argv: string[]): string {
  const q = (s: string) => (/^[A-Za-z0-9_./:=@%+-]+$/.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`);
  return [fabricPath, ...argv].map(q).join(" ");
}
