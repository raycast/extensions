import { openAsBlob } from "node:fs";
import { basename } from "node:path";

export const API_BASE_URL = "https://api.deapi.ai/api/v2";
const USER_AGENT = "deapi-raycast/1.0";
const POLL_INTERVAL_MS = 3000;

export type InferenceType =
  | "txt2img"
  | "img2img"
  | "txt2video"
  | "img2video"
  | "txt2audio"
  | "audio2text"
  | "video2text"
  | "audio_file2text"
  | "video_file2text"
  | "img-rmbg"
  | "img-upscale";

export interface ModelLimits {
  min_width?: number | null;
  max_width?: number | null;
  min_height?: number | null;
  max_height?: number | null;
  min_side?: number | null;
  max_side?: number | null;
  max_ratio?: number | null;
  max_pixels?: number | null;
  dimension_multiple?: number | null;
  resolution_step?: number | null;
  min_steps?: number | null;
  max_steps?: number | null;
  min_frames?: number | null;
  max_frames?: number | null;
  min_fps?: number | null;
  max_fps?: number | null;
  min_text?: number | null;
  max_text?: number | null;
  min_speed?: number | null;
  max_speed?: number | null;
}

export interface ModelDefaults {
  width?: number;
  height?: number;
  steps?: number;
  frames?: number;
  fps?: number;
  voice?: string;
  lang?: string;
  speed?: number;
  format?: string;
  sample_rate?: number;
}

export interface Model {
  name: string;
  slug: string;
  inference_types: string[];
  tags?: string[];
  status?: string;
  info?: {
    limits?: ModelLimits;
    defaults?: ModelDefaults;
    features?: Record<string, boolean | null | undefined>;
  };
}

export type JobStatus = "pending" | "processing" | "done" | "error";

export interface Job {
  status: JobStatus;
  progress?: number | string | null;
  result_url?: string | null;
  result?: string | null;
  error_code?: string | null;
  error_reason?: string | null;
  refunded?: boolean | null;
}

export interface Balance {
  balance: number;
  currency?: string;
}

/** A multipart field: a plain value, or a local file to upload. */
export type FormValue = string | number | boolean | { file: string } | undefined | null;

export class DeapiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DeapiError";
  }
}

export class DeapiClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Accept", "application/json");
    headers.set("User-Agent", USER_AGENT);

    const response = await this.fetchImpl(`${API_BASE_URL}${path}`, { ...init, headers });
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    if (!response.ok) {
      throw new DeapiError(errorMessage(response.status, body, text), response.status);
    }
    return body as T;
  }

  async listModels(inferenceType?: InferenceType | InferenceType[]): Promise<Model[]> {
    const models: Model[] = [];
    let page = 1;
    let lastPage = 1;
    do {
      const response = await this.request<{ data?: Model[]; meta?: { last_page?: number } }>(
        `/models?per_page=100&page=${page}`,
      );
      models.push(...(response.data ?? []));
      lastPage = response.meta?.last_page ?? 1;
      page++;
    } while (page <= lastPage);

    if (!inferenceType) return models;
    const types = Array.isArray(inferenceType) ? inferenceType : [inferenceType];
    return models.filter((model) => types.some((type) => model.inference_types?.includes(type)));
  }

  async getBalance(): Promise<Balance> {
    const response = await this.request<{ data?: Balance }>("/account/balance");
    if (!response?.data) throw new DeapiError("deAPI returned no balance.");
    return response.data;
  }

  /** Submits a job with a JSON body and returns its request ID. */
  async submitJson(path: string, body: Record<string, unknown>): Promise<string> {
    const response = await this.request<{ data?: { request_id?: string } }>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compact(body)),
    });
    return requireRequestId(response);
  }

  /** Submits a job as multipart form data and returns its request ID. Values like `{ file }` are uploaded. */
  async submitForm(path: string, fields: Record<string, FormValue>): Promise<string> {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === "") continue;
      if (typeof value === "object") {
        form.append(key, await openAsBlob(value.file, { type: mimeTypeFor(value.file) }), basename(value.file));
      } else if (typeof value === "boolean") {
        form.append(key, value ? "1" : "0");
      } else {
        form.append(key, String(value));
      }
    }
    const response = await this.request<{ data?: { request_id?: string } }>(path, { method: "POST", body: form });
    return requireRequestId(response);
  }

  async getJob(requestId: string): Promise<Job> {
    const response = await this.request<{ data?: Job }>(`/jobs/${encodeURIComponent(requestId)}`);
    if (!response?.data) throw new DeapiError("deAPI returned no job status.");
    return response.data;
  }

  /**
   * Polls a job until it is done or fails. Throws on failure, or when `timeoutMs` passes.
   * `onUpdate` is called after every poll.
   */
  async waitForJob(
    requestId: string,
    options: { timeoutMs?: number; signal?: AbortSignal; onUpdate?: (job: Job) => void } = {},
  ): Promise<Job> {
    const deadline = Date.now() + (options.timeoutMs ?? 10 * 60 * 1000);
    for (;;) {
      if (options.signal?.aborted) throw new DeapiError("Cancelled.");
      const job = await this.getJob(requestId);
      options.onUpdate?.(job);
      if (job.status === "done") return job;
      if (job.status === "error") throw new DeapiError(jobErrorMessage(job));
      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        throw new DeapiError("The job is still running. Check it later in Generation History.");
      }
      await sleep(POLL_INTERVAL_MS, options.signal);
    }
  }
}

export function jobErrorMessage(job: Job): string {
  const reason = job.error_reason || job.error_code || "unknown error";
  return `The job failed: ${reason}${job.refunded ? " (the charge was refunded)" : ""}`;
}

function requireRequestId(response: { data?: { request_id?: string } } | undefined): string {
  const requestId = response?.data?.request_id;
  if (!requestId) throw new DeapiError("deAPI did not return a request ID.");
  return requestId;
}

function errorMessage(status: number, body: unknown, text: string): string {
  if (status === 401) return "deAPI rejected the API key. Check it in the extension preferences.";
  if (status === 402) return "Your deAPI balance is too low. Top up at app.deapi.ai.";
  if (status === 429) return "deAPI rate limit reached. Try again in a moment.";

  if (body && typeof body === "object") {
    const record = body as { message?: unknown; errors?: Record<string, unknown> };
    const firstFieldError = record.errors ? Object.values(record.errors).flat()[0] : undefined;
    if (typeof firstFieldError === "string") return firstFieldError;
    if (typeof record.message === "string" && record.message) return record.message;
  }
  return `deAPI request failed (HTTP ${status})${text ? `: ${text.slice(0, 200)}` : ""}`;
}

function compact(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DeapiError("Cancelled."));
      },
      { once: true },
    );
  });
}

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
};

export function mimeTypeFor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[extension] ?? "application/octet-stream";
}
