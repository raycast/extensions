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
  headline: string;
  summary: string;
  breakdown: { ai: number; aiAssisted: number; human: number };
  modelVersion: string;
  segments: Segment[];
}

export interface CheckOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
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

/** Task payload from `GET /task/{id}`; result fields are present on success only. */
interface Task {
  stage: string;
  version: string;
  headline: string;
  prediction: string;
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

/** Runs one Pangram Check: submits the text, then polls the task until it finishes. */
export async function checkText(text: string, { apiKey, model, timeoutMs }: CheckOptions): Promise<CheckResult> {
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
      const message = typeof detail === "string" ? detail : `Pangram API error ${response.status}`;
      throw new PangramError(message, response.status);
    }
    return body as T;
  };

  try {
    const { task_id } = await request<{ task_id: string }>("/task", {
      method: "POST",
      body: JSON.stringify({ text, model }),
    });
    for (;;) {
      const task = await request<Task>(`/task/${task_id}`);
      if (task.stage === "STAGE_SUCCESS") return toCheckResult(task);
      if (task.stage === "STAGE_FAILED") throw new PangramError(task.headline);
      await sleep(POLL_INTERVAL_MS, undefined, { signal });
    }
  } catch (error) {
    if (signal.aborted) throw new PangramError(`Pangram didn't finish within ${timeoutMs / 1000} s`);
    throw error;
  }
}

function toCheckResult(task: Task): CheckResult {
  return {
    verdict: task.prediction_short,
    headline: task.headline,
    summary: task.prediction,
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
