import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";

const API_URL = "https://api.popnow.ai/api/v1";
export const KEYS_URL = "https://popnow.ai/api/console/keys";
export const BILLING_URL = "https://popnow.ai/api/console/billing";

export type Modality = "image" | "video" | "audio";

export interface ModelPrice {
  unit?: string;
  perUnit?: string;
  currency?: string;
}

export interface ModelSummary {
  model: string;
  displayName?: string;
  family?: string;
  modality?: string;
  tasks?: string[];
  usd?: ModelPrice;
  available?: boolean;
}

export interface SchemaProperty {
  type?: string;
  enum?: Array<string | number>;
  default?: string | number | boolean;
  description?: string;
}

export interface ModelInfo extends ModelSummary {
  inputSchema?: { properties?: Record<string, SchemaProperty>; required?: string[] };
}

export interface Quote {
  quoteId?: string;
  maxChargeUsd: string;
  expectedChargeUsd?: string;
}

export interface TaskAsset {
  url?: string;
  mime?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  pending?: boolean;
  unavailable?: boolean;
}

export interface TaskRecord {
  taskId: string;
  model?: string;
  state: string;
  output?: { text?: string; assets?: TaskAsset[] };
  errorCode?: string;
  errorMessage?: string;
  costUsd?: string;
  estimatedCostUsd?: string;
}

export class PopNowError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }

  /** The account balance is too low for this call. */
  get isBalance(): boolean {
    return this.status === 402 || /balance|insufficient/i.test(`${this.code ?? ""} ${this.message}`);
  }

  /** The API key is missing, wrong or revoked. */
  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

const TERMINAL = new Set(["succeeded", "failed", "canceled", "expired"]);

export function isFinished(task: TaskRecord): boolean {
  if (!TERMINAL.has(task.state)) return false;
  return !(task.output?.assets ?? []).some((asset) => asset.pending && !asset.unavailable);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "User-Agent": "popnow-raycast",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  let body: {
    code?: number | string;
    msg?: string;
    message?: string;
    data?: T;
    error?: { code?: string; message?: string };
  } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON bodies only come from proxies; report the status instead.
  }
  if (!response.ok) {
    const message = body.error?.message ?? body.msg ?? body.message ?? `PopNow returned HTTP ${response.status}`;
    throw new PopNowError(message, response.status, body.error?.code ?? String(body.code ?? ""));
  }
  return (body.data ?? body) as T;
}

export async function listModels(params: { modality?: Modality; task?: string; search?: string }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const data = await request<{ total?: number; items?: ModelSummary[] }>(`/models?${query.toString()}`);
  return (data.items ?? []).filter((item) => item.available !== false);
}

export function getModel(model: string) {
  return request<ModelInfo>(`/models/${model.split("/").map(encodeURIComponent).join("/")}`);
}

/** Prices a request without starting it. Free. */
export function quote(model: string, input: Record<string, unknown>) {
  return request<Quote>("/jobs/quote", { method: "POST", body: JSON.stringify({ model, input }) });
}

/**
 * Starts a paid task. The quoted maximum is sent as `expectedCostUsd`, so a price change
 * fails the call instead of charging more. The idempotency key makes a retry return the same task.
 */
export function createTask(
  model: string,
  input: Record<string, unknown>,
  q: Quote,
  idempotencyKey: string = randomUUID(),
) {
  return request<TaskRecord>("/jobs/createTask?wait=30", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ model, input, quoteId: q.quoteId, expectedCostUsd: q.maxChargeUsd }),
  });
}

export function getTask(taskId: string) {
  return request<TaskRecord>(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
}

export function formatPrice(price?: ModelPrice): string {
  if (!price?.perUnit) return "";
  const unit = (price.unit ?? "").replace(/^per_/, "").replace(/_/g, " ");
  return unit ? `$${price.perUnit} / ${unit}` : `$${price.perUnit}`;
}

export function modelTitle(item: ModelSummary): string {
  return item.displayName ?? item.model;
}
