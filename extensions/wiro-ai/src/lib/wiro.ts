import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

export const API_BASE_URL = "https://api.wiro.ai/v1";
export const SITE_URL = "https://wiro.ai";
export const USER_AGENT = "Wiro-Raycast/1.0";

export interface Credentials {
  apiKey: string;
  apiSecret?: string;
}

export class WiroError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WiroError";
    this.status = status;
  }
}

export interface ToolParameterOption {
  value?: string | number;
  text?: string;
  label?: string;
  id?: string | number;
  name?: string;
}

export interface ToolParameter {
  id: string;
  type: string;
  label?: string;
  description?: string;
  placeholder?: string;
  note?: string;
  required?: boolean;
  advanced?: boolean;
  defaultvalue?: unknown;
  /** The form's current value; a checkbox's default. */
  value?: unknown;
  options?: ToolParameterOption[];
  minvalue?: string | number;
  maxvalue?: string | number;
}

export interface ToolParameterGroup {
  title?: string;
  items?: ToolParameter[];
}

export interface PriceEntry {
  inputs?: Record<string, string | number | boolean>;
  price?: number | string;
  priceMethod?: string;
  note?: string;
}

export interface WiroModel {
  id: string;
  title: string;
  cleanslugowner: string;
  cleanslugproject: string;
  description?: string;
  seodescription?: string;
  categories?: string[];
  image?: string;
  computingtime?: string;
  parameters?: ToolParameterGroup[] | null;
  dynamicprice?: PriceEntry[] | string | null;
  taskstat?: { runcount?: number | string } | null;
  /** Estimated cost of a run for models billed by run time. */
  approximatelycost?: number | string | null;
  /** Cost per second of run time, when the model has no price list. */
  cps?: number | string | null;
  /** The caller's discount on this model, in percent; set when Tool/Detail is called with a key. */
  discount?: number | string | null;
}

export interface TaskOutput {
  name?: string;
  contenttype?: string;
  size?: string;
  url?: string;
}

export interface TaskOutputContent {
  answer?: Array<string | { text?: string }> | string | null;
  raw?: string;
}

export interface Task {
  id: string;
  socketaccesstoken: string;
  status: string;
  pexit?: string;
  elapsedseconds?: string;
  totalcost?: string;
  chargedcost?: string | number | null;
  outputs?: Array<TaskOutput & { content?: TaskOutputContent }>;
  /** The model's standard output; models such as speech to text print their result there. */
  debugoutput?: string;
  parameters?: Record<string, unknown> | null;
  createtime?: string | number;
  modelslugowner?: string;
  modelslugproject?: string;
}

export interface RunResult {
  taskid: string;
  tasktoken: string;
}

export interface UploadFile {
  /** The model parameter the file goes to, such as `inputImage`. */
  field: string;
  /** Path of a local file. */
  path: string;
  /** Wiro parameter type of `field`, from Tool/Detail. */
  type: string;
}

interface WiroEnvelope {
  result?: boolean;
  errors?: Array<{ message?: string }>;
}

/** `owner/project` of a catalog model, as model pages and the Run API use it. */
export function modelSlug(model: Pick<WiroModel, "cleanslugowner" | "cleanslugproject">): string {
  return `${model.cleanslugowner}/${model.cleanslugproject}`;
}

export function modelPageUrl(slug: string): string {
  return `${SITE_URL}/models/${slug}`;
}

export function splitSlug(slug: string): [string, string] {
  const [owner, ...rest] = slug.trim().split("/");
  const project = rest.join("/");
  if (!owner || !project) {
    throw new WiroError(`"${slug}" is not a model ID. Use the owner/model form, such as openai/gpt-image-2.`);
  }
  return [owner, project];
}

/** Headers for one Run API request. Signature projects sign every request with a fresh nonce. */
export function runApiHeaders(credentials: Credentials): Record<string, string> {
  const apiKey = credentials.apiKey.trim();
  const apiSecret = credentials.apiSecret?.trim();
  const headers: Record<string, string> = { "x-api-key": apiKey, "User-Agent": USER_AGENT };
  if (apiSecret) {
    const nonce = Date.now().toString();
    headers["x-nonce"] = nonce;
    headers["x-signature"] = createHmac("sha256", apiKey)
      .update(apiSecret + nonce)
      .digest("hex");
  }
  return headers;
}

function envelopeError(body: WiroEnvelope, fallback: string): string {
  const messages = (body.errors ?? []).map((error) => error?.message?.trim()).filter(Boolean);
  return messages.length > 0 ? messages.join(", ") : fallback;
}

function httpErrorMessage(status: number, text: string, credentials?: Credentials): string {
  let message = text.trim();
  try {
    const body = JSON.parse(text) as WiroEnvelope & { message?: string };
    message = envelopeError(body, body.message ?? message);
  } catch {
    if (/^\s*</.test(message)) message = "";
  }
  if (status === 401 && credentials && !credentials.apiSecret?.trim() && /signature/i.test(text)) {
    return "This project uses signature-based authentication. Add its API secret in the extension preferences.";
  }
  if (status === 401 || status === 403) {
    return message ? `Wiro AI rejected the API key: ${message}` : "Wiro AI rejected the API key.";
  }
  return message ? `Wiro AI error ${status}: ${message}` : `Wiro AI error ${status}`;
}

async function readJson<T extends WiroEnvelope>(response: Response, credentials?: Credentials): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new WiroError(httpErrorMessage(response.status, text, credentials), response.status);
  }
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    throw new WiroError("Wiro AI sent an answer that could not be read.");
  }
  if (body.result === false) {
    throw new WiroError(envelopeError(body, "Wiro AI could not complete the request."));
  }
  return body;
}

async function post<T extends WiroEnvelope>(
  path: string,
  body: Record<string, unknown>,
  credentials?: Credentials,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = credentials ? runApiHeaders(credentials) : { "User-Agent": USER_AGENT };
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  return readJson<T>(response, credentials);
}

export interface ListModelsOptions {
  search?: string;
  categories?: string[];
  start?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface ModelPage {
  models: WiroModel[];
  total: number;
}

/** Searches the public catalog. No API key is needed. */
export async function listModels(options: ListModelsOptions = {}): Promise<ModelPage> {
  const body = await post<WiroEnvelope & { tool?: WiroModel[]; total?: number | string }>(
    "/Tool/List",
    {
      start: String(options.start ?? 0),
      limit: String(options.limit ?? 30),
      search: options.search ?? "",
      categories: options.categories ?? [],
      sort: "relevance",
      hideworkflows: true,
      summary: true,
    },
    undefined,
    options.signal,
  );
  return { models: body.tool ?? [], total: Number(body.total ?? 0) || 0 };
}

/**
 * One model with its parameters and price list. No API key is needed; with one, the answer
 * also carries the caller's discount on the model.
 */
export async function getModel(slug: string, credentials?: Credentials, signal?: AbortSignal): Promise<WiroModel> {
  const [slugowner, slugproject] = splitSlug(slug);
  const body = await post<WiroEnvelope & { tool?: WiroModel[] }>(
    "/Tool/Detail",
    { slugowner, slugproject },
    credentials,
    signal,
  );
  const model = body.tool?.[0];
  if (!model) throw new WiroError(`Wiro AI has no model called ${slug}.`);
  return model;
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".avif": "image/avif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".aif": "audio/aiff",
  ".aiff": "audio/aiff",
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
};

export function mimeType(path: string): string {
  return MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/** The companion URL field of a file parameter, which multipart runs send empty. */
export function urlField(id: string, type: string): string | undefined {
  if (type === "fileinput") return `${id}Url`;
  if (type === "multifileinput")
    return id.endsWith("Multiple") ? `${id.slice(0, -"Multiple".length)}UrlMultiple` : `${id}Url`;
  return undefined;
}

function formValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

/** Starts a model run. Parameters go as JSON, or as multipart form data when files are attached. */
export async function runModel(
  slug: string,
  params: Record<string, unknown>,
  credentials: Credentials,
  files: UploadFile[] = [],
  signal?: AbortSignal,
): Promise<RunResult> {
  const [owner, project] = splitSlug(slug);
  const url = `${API_BASE_URL}/Run/${encodeURIComponent(owner)}/${encodeURIComponent(project)}`;
  let response: Response;

  if (files.length === 0) {
    response = await fetch(url, {
      method: "POST",
      headers: { ...runApiHeaders(credentials), "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
  } else {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      form.append(key, formValue(value));
    }
    for (const file of files) {
      const data = await readFile(file.path);
      form.append(file.field, new Blob([data], { type: mimeType(file.path) }), basename(file.path));
      const companion = urlField(file.field, file.type);
      if (companion) form.append(companion, "");
    }
    response = await fetch(url, { method: "POST", headers: runApiHeaders(credentials), body: form, signal });
  }

  const body = await readJson<WiroEnvelope & { taskid?: string | number; socketaccesstoken?: string }>(
    response,
    credentials,
  );
  if (!body.socketaccesstoken) {
    throw new WiroError(
      body.taskid
        ? `Wiro AI started task ${body.taskid} but did not send its token. Find the result in your task history.`
        : "Wiro AI did not start the task.",
    );
  }
  return { taskid: String(body.taskid ?? ""), tasktoken: body.socketaccesstoken };
}

export async function getTask(tasktoken: string, credentials: Credentials, signal?: AbortSignal): Promise<Task> {
  const body = await post<WiroEnvelope & { tasklist?: Task[] }>("/Task/Detail", { tasktoken }, credentials, signal);
  const task = body.tasklist?.[0];
  if (!task) throw new WiroError("Wiro AI did not return the task.");
  return task;
}

/** Cancels a queued task, or stops one that already runs. */
export async function stopTask(task: Pick<Task, "id" | "status">, credentials: Credentials): Promise<void> {
  const path = task.status === "task_queue" ? "/Task/Cancel" : "/Task/Kill";
  await post(path, { taskid: task.id }, credentials);
}

export const TERMINAL_STATUSES = new Set(["task_postprocess_end", "task_cancel"]);

export function isFinished(task: Pick<Task, "status">): boolean {
  return TERMINAL_STATUSES.has(task.status);
}

/** A finished task failed only when its exit code is set and is not "0". */
export function isSuccessful(task: Pick<Task, "status" | "pexit">): boolean {
  const pexit = String(task.pexit ?? "").trim();
  return task.status === "task_postprocess_end" && (pexit === "" || pexit === "0");
}

/** A short, human label for a task status. */
export function statusLabel(status: string): string {
  switch (status) {
    case "task_queue":
      return "Waiting in queue";
    case "task_accept":
    case "task_preprocess_start":
    case "task_preprocess_end":
    case "task_assign":
    case "task_error":
      return "Preparing";
    case "task_start":
    case "task_output":
    case "task_output_full":
    case "task_error_full":
      return "Generating";
    case "task_end":
    case "task_postprocess_start":
      return "Finishing";
    case "task_postprocess_end":
      return "Done";
    case "task_cancel":
      return "Cancelled";
    default:
      return "Starting";
  }
}

/** How often to ask for a task's status, by how long it has been running. */
export function pollInterval(elapsedMs: number): number {
  if (elapsedMs < 15_000) return 2_000;
  if (elapsedMs < 60_000) return 4_000;
  return 8_000;
}

/** Why a finished task has no result. The model's own error log is not shown to users. */
export function failureReason(task: Pick<Task, "status">): string {
  if (task.status === "task_cancel") return "The task was cancelled.";
  return "The model could not finish this task. Check the prompt and settings, or try another model.";
}

function trimZeros(value: string): string {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  // Keep cents readable: 0.2 becomes 0.20.
  return /\.\d$/.test(trimmed) ? `${trimmed}0` : trimmed;
}

/** A dollar amount: cents above a dollar, three decimals above a cent, three significant digits below. */
export function formatUsd(amount: number): string {
  if (amount === 0) return "$0";
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${trimZeros(amount.toFixed(3))}`;
  return `$${trimZeros(amount.toPrecision(3))}`;
}

export function formatCost(value: string | number | undefined): string | undefined {
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost <= 0) return undefined;
  return formatUsd(cost);
}

export function formatSeconds(value: string | number | undefined): string | undefined {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}

// Account, history, files, workflows and agents. These act on the API key's project.

export interface WalletBalance {
  totalUsd: number;
  depositUsd: number;
  couponCreditUsd: number;
  storeRevenueUsd: number;
}

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** The balance of the wallet the project pays from, or null when it has no wallet yet. */
export async function getWallet(credentials: Credentials, signal?: AbortSignal): Promise<WalletBalance | null> {
  const body = await post<WiroEnvelope & { wallet?: Array<Record<string, unknown>> }>(
    "/Wallet/List",
    {},
    credentials,
    signal,
  );
  const wallets = body.wallet ?? [];
  const wallet = wallets.find((row) => row.symbol === "USD") ?? wallets[0];
  if (!wallet) return null;
  const depositUsd = money(wallet.amount);
  const couponCreditUsd = money(wallet.giftedamount);
  const storeRevenueUsd = money(wallet.storeamount);
  return {
    totalUsd: Math.round((depositUsd + couponCreditUsd + storeRevenueUsd) * 100) / 100,
    depositUsd,
    couponCreditUsd,
    storeRevenueUsd,
  };
}

/** The project's model tasks, newest first. */
export async function listTasks(
  credentials: Credentials,
  options: { start?: number; limit?: number; signal?: AbortSignal } = {},
): Promise<{ tasks: Task[]; total: number }> {
  const body = await post<WiroEnvelope & { tasklist?: Task[]; total?: number | string }>(
    "/Task/List",
    { type: "model", sort: "id", order: "DESC", start: String(options.start ?? 0), limit: String(options.limit ?? 30) },
    credentials,
    options.signal,
  );
  return { tasks: body.tasklist ?? [], total: Number(body.total ?? 0) || 0 };
}

/** Uploads a local file to the project's storage and returns its public URL. */
export async function uploadFile(path: string, credentials: Credentials, signal?: AbortSignal): Promise<string> {
  const data = await readFile(path);
  const form = new FormData();
  form.append("file", new Blob([data], { type: mimeType(path) }), basename(path));
  const response = await fetch(`${API_BASE_URL}/File/Upload`, {
    method: "POST",
    headers: runApiHeaders(credentials),
    body: form,
    signal,
  });
  const body = await readJson<WiroEnvelope & { list?: Array<{ url?: string }> }>(response, credentials);
  const url = body.list?.[0]?.url;
  if (!url) throw new WiroError(`Wiro AI did not return a link for ${basename(path)}.`);
  return url;
}

/** The project's workflows, most recently changed first. */
export async function listWorkflows(
  credentials: Credentials,
  options: { search?: string; start?: number; limit?: number; signal?: AbortSignal } = {},
): Promise<{ workflows: Array<Record<string, unknown>>; total: number }> {
  const body: Record<string, unknown> = {
    scope: "my",
    sort: "updatetime",
    order: "DESC",
    start: String(options.start ?? 0),
    limit: String(options.limit ?? 30),
  };
  if (options.search?.trim()) body.search = options.search.trim();
  const result = await post<WiroEnvelope & { workflow?: Array<Record<string, unknown>>; total?: number | string }>(
    "/Workflow/List",
    body,
    credentials,
    options.signal,
  );
  return { workflows: result.workflow ?? [], total: Number(result.total ?? 0) || 0 };
}

/** One workflow, with its inputs and step graph. */
export async function getWorkflow(
  fullSlug: string,
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const body = await post<WiroEnvelope & { workflow?: Array<Record<string, unknown>> }>(
    "/Workflow/Detail",
    { slug: fullSlug },
    credentials,
    signal,
  );
  const row = body.workflow?.[0];
  if (!row) throw new WiroError("Wiro AI could not find this workflow.");
  return row;
}

/** Starts a workflow run and returns its token. */
export async function runWorkflow(
  fullSlug: string,
  input: Record<string, unknown>,
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<string> {
  const body = await post<WiroEnvelope & { workflowtoken?: string }>(
    "/Workflow/Run",
    Object.keys(input).length > 0 ? { slug: fullSlug, input } : { slug: fullSlug },
    credentials,
    signal,
  );
  if (!body.workflowtoken) throw new WiroError("Wiro AI did not start the workflow run.");
  return body.workflowtoken;
}

/** A workflow run and its steps. */
export async function getWorkflowRun(
  workflowtoken: string,
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<{ run: Record<string, unknown>; nodes: Array<Record<string, unknown>> }> {
  const body = await post<
    WiroEnvelope & { workflowrun?: Record<string, unknown>; workflowrunnodes?: Array<Record<string, unknown>> }
  >("/Workflow/RunDetail", { workflowtoken }, credentials, signal);
  return { run: body.workflowrun ?? { workflowtoken }, nodes: body.workflowrunnodes ?? [] };
}

/** The agents deployed in the project's workspace. */
export async function listAgents(
  credentials: Credentials,
  options: { start?: number; limit?: number; signal?: AbortSignal } = {},
): Promise<Array<Record<string, unknown>>> {
  const body = await post<WiroEnvelope & { useragents?: Array<Record<string, unknown>> }>(
    "/UserAgent/MyAgents",
    { sort: "lastactivityat", order: "DESC", start: options.start ?? 0, limit: options.limit ?? 50 },
    credentials,
    options.signal,
  );
  return body.useragents ?? [];
}

/** Sends a message to a deployed agent and returns the message id. The agent's credits pay for it. */
export async function sendAgentMessage(
  agentGuid: string,
  message: string,
  sessionKey: string,
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<string> {
  const body = await post<WiroEnvelope & { messageguid?: string }>(
    "/UserAgent/Message/Send",
    { useragentguid: agentGuid, message, sessionkey: sessionKey },
    credentials,
    signal,
  );
  if (!body.messageguid) throw new WiroError("The agent did not accept the message.");
  return body.messageguid;
}

/** One message of a deployed agent, with its status and reply so far. */
export async function getAgentMessage(
  agentGuid: string,
  messageId: string,
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const body = await post<WiroEnvelope & { data?: Record<string, unknown> }>(
    "/UserAgent/Message/Detail",
    { useragentguid: agentGuid, messageguid: messageId },
    credentials,
    signal,
  );
  if (!body.data) throw new WiroError("Wiro AI could not find the message.");
  return body.data;
}
