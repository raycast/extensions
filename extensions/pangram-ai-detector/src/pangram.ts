import { setTimeout as sleep } from "node:timers/promises";

const BASE_URL = "https://text.external-api.pangram.com";
const POLL_INTERVAL_MS = 500;

export type Verdict = "AI" | "Human" | "Mixed";

export interface Segment {
  text: string;
  label: "AI-Generated" | "AI-Assisted" | "Human Written";
  confidence: "High" | "Medium" | "Low";
  wordCount: number;
  isHumanized: boolean;
}

/** The outcome of one Check, in the extension's domain language. */
export interface CheckResult {
  verdict: Verdict;
  breakdown: { ai: number; aiAssisted: number; human: number };
  modelVersion: string;
  segments: Segment[];
}

export interface CheckOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Resume this submitted task instead of submitting the text again. */
  taskId?: string;
  /** Runs once Pangram accepts the text, with the task ID a retry can resume. */
  onSubmit?: (taskId: string) => void;
}

/** A failed Check. `status` is the HTTP status when the API rejected the request. */
export class PangramError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PangramError";
  }
}

/** A Check that outlasted the timeout. Its task may still finish. */
export class CheckTimeoutError extends PangramError {}

/** Task payload from `GET /task/{id}`; result fields are present on success only. */
interface Task {
  stage: string;
  version: string;
  headline: string;
  prediction_short: Verdict;
  fraction_ai: number;
  fraction_ai_assisted: number;
  fraction_human: number;
  windows: {
    text: string;
    label: Segment["label"];
    confidence: Segment["confidence"];
    word_count: number;
    is_humanized: boolean;
  }[];
}

/** Runs one Pangram Check: submits the text (or resumes `taskId`), then polls the task until it finishes. */
export async function checkText(
  text: string,
  { apiKey, model, timeoutMs, taskId, onSubmit }: CheckOptions,
): Promise<CheckResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const detail = (body as { detail?: unknown } | undefined)?.detail;
      const message = typeof detail === "string" ? detail : `Pangram API request failed (HTTP ${response.status}).`;
      throw new PangramError(message, response.status);
    }
    return body as T;
  };

  try {
    if (!taskId) {
      ({ task_id: taskId } = await request<{ task_id: string }>("/task", {
        method: "POST",
        body: JSON.stringify({ text, model }),
      }));
      onSubmit?.(taskId);
    }
    for (;;) {
      // The Check is already paid for: ride out temporary poll failures until the timeout.
      const task = await request<Task>(`/task/${taskId}`).catch((error: unknown) => {
        if (signal.aborted || !isTemporary(error)) throw error;
      });
      if (task?.stage === "STAGE_SUCCESS") return toCheckResult(task);
      if (task?.stage === "STAGE_FAILED") throw new PangramError(task.headline);
      await sleep(POLL_INTERVAL_MS, undefined, { signal });
    }
  } catch (error) {
    if (signal.aborted) throw new CheckTimeoutError(`Check timed out after ${timeoutMs / 1000} seconds.`);
    throw error;
  }
}

/** Whether a failed request may succeed if repeated: a network error, rate limit, or server error. */
function isTemporary(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch rejects with TypeError on network failure
  const status = error instanceof PangramError ? error.status : undefined;
  return status !== undefined && (status === 429 || status >= 500);
}

function toCheckResult(task: Task): CheckResult {
  return {
    verdict: task.prediction_short,
    breakdown: { ai: task.fraction_ai, aiAssisted: task.fraction_ai_assisted, human: task.fraction_human },
    modelVersion: task.version,
    segments: task.windows.map((window) => ({
      text: window.text,
      label: window.label,
      confidence: window.confidence,
      wordCount: window.word_count,
      isHumanized: window.is_humanized,
    })),
  };
}
