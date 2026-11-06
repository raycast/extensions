import { setTimeout as delay } from "node:timers/promises";

export type SpeechInput =
  | { mode: "single"; text: string; voiceName: string }
  | { mode: "multi"; segments: { speaker: string; text: string; voiceName: string }[] };
export interface AudioResult {
  url: string;
  mimeType: "audio/wav";
  sampleRate: 24000;
  channels: 1;
  bitsPerSample: 16;
  access: "link";
}
export interface Job {
  id: string;
  requestId: string;
  status: string;
  result?: AudioResult | null;
  resultDeleted?: boolean;
  usage: { billableCharacters: number; reservedCredits: number; chargedCredits: number };
  error?: { code: string };
}
export interface Voice {
  name: string;
  description: string;
  gender: string;
}
interface Context {
  deadline: number;
  requestId?: string;
  jobId?: string;
  signal?: AbortSignal;
}
interface Options {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxAudioBytes?: number;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING = new Set(["queued", "running", "merging", "settling"]);
const TERMINAL = new Set(["success", "failed", "cancelled"]);
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

class InvalidResponse extends Error {}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidResponse("Expected an object");
  return value as Record<string, unknown>;
}
function nonempty(value: unknown, name: string, maximum = Infinity): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) throw new Error(`Invalid ${name}`);
  return value;
}
function fields(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("Unsupported speech input fields");
}
function counter(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function validateId(id: unknown): string {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Expected a UUID request or job ID");
  return id.toLowerCase();
}
function safeUrl(value: string, allowLocal: boolean): URL {
  // eslint-disable-next-line no-control-regex -- Reject URL control characters before parsing.
  if (typeof value !== "string" || /[\x00-\x20\\]/.test(value)) throw new InvalidResponse("Invalid URL");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.hash ||
    (url.protocol !== "https:" && !(allowLocal && local && url.protocol === "http:"))
  )
    throw new InvalidResponse("Expected an HTTPS URL without embedded credentials");
  return url;
}
function retryDelay(headers: Headers | undefined, fallback: number): number {
  const value = headers?.get("retry-after");
  if (!value) return fallback;
  const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1000;
  return Number.isFinite(seconds) ? Math.max(fallback, seconds * 1000) : fallback;
}
async function boundedBody(response: Response, maximum: number, signal: AbortSignal): Promise<Uint8Array> {
  const header = response.headers.get("content-length");
  if (header !== null && (!/^\d+$/.test(header) || !Number.isSafeInteger(Number(header)) || Number(header) > maximum)) {
    await response.body?.cancel();
    throw new InvalidResponse("Response exceeds configured size limit or has an invalid length");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new InvalidResponse("Empty response body");
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const part = await reader.read();
      signal.throwIfAborted();
      if (part.done) break;
      length += part.value.length;
      if (length > maximum) throw new InvalidResponse("Response exceeds configured size limit");
      chunks.push(part.value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks, length);
}
function speechInput(value: unknown): SpeechInput {
  const input = object(value);
  let result: SpeechInput;
  if (input.mode === "single") {
    fields(input, ["mode", "text", "voiceName"]);
    result = {
      mode: "single",
      text: nonempty(input.text, "speech text"),
      voiceName: nonempty(input.voiceName, "voice name", 100),
    };
  } else if (input.mode === "multi") {
    fields(input, ["mode", "segments"]);
    if (!Array.isArray(input.segments) || !input.segments.length || input.segments.length > 1000)
      throw new Error("Expected 1 to 1000 speaker turns");
    const assignments = new Map<string, string>();
    result = {
      mode: "multi",
      segments: input.segments.map((value) => {
        const turn = object(value);
        fields(turn, ["speaker", "text", "voiceName"]);
        const speaker = nonempty(turn.speaker, "speaker label", 100).trim();
        const voiceName = nonempty(turn.voiceName, "voice name", 100).trim();
        const text = nonempty(turn.text, "speech text");
        if (assignments.has(speaker) && assignments.get(speaker) !== voiceName)
          throw new Error("Each speaker must use one consistent voice");
        assignments.set(speaker, voiceName);
        return { speaker, text, voiceName };
      }),
    };
  } else throw new Error("Expected single or multi speech mode");
  const turns = result.mode === "single" ? [result] : result.segments;
  if (turns.reduce((n, turn) => n + turn.text.length, 0) > 100_000)
    throw new Error("Speech exceeds 100000 UTF-16 code units");
  if (Buffer.byteLength(JSON.stringify({ input: result })) > 1024 * 1024)
    throw new Error("Input exceeds the JSON body limit");
  return result;
}
export function dialogueInput(text: string, voiceA: string, voiceB: string): SpeechInput {
  nonempty(text, "dialogue");
  const segments: { speaker: string; text: string; voiceName: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^(Speaker[12]):\s*(.*)$/.exec(line.trim());
    if (match)
      segments.push({ speaker: match[1], text: match[2], voiceName: match[1] === "Speaker1" ? voiceA : voiceB });
    else if (line.trim() && segments.length) segments[segments.length - 1].text += "\n" + line;
    else if (line.trim()) throw new Error("Dialogue must start with Speaker1: or Speaker2:");
  }
  return speechInput({ mode: "multi", segments });
}
export function validateWav(audio: Uint8Array): void {
  const bytes = Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength);
  const invalid = () => new InvalidResponse("Downloaded result is not a complete 24000 Hz mono 16-bit PCM WAV");
  if (
    bytes.length < 12 ||
    bytes.toString("latin1", 0, 4) !== "RIFF" ||
    bytes.toString("latin1", 8, 12) !== "WAVE" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    throw invalid();
  let offset = 12,
    formatSeen = false,
    dataSeen = false;
  // RIFF chunks have independent lengths and an extra pad byte when their size is odd.
  while (offset < bytes.length) {
    if (bytes.length - offset < 8) throw invalid();
    const name = bytes.toString("latin1", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8,
      end = start + size,
      next = end + (size % 2);
    if (next > bytes.length) throw invalid();
    if (name === "fmt ") {
      if (formatSeen || dataSeen || size < 16) throw invalid();
      if (size !== 16 && (size < 18 || bytes.readUInt16LE(start + 16) !== size - 18)) throw invalid();
      if (
        bytes.readUInt16LE(start) !== 1 ||
        bytes.readUInt16LE(start + 2) !== 1 ||
        bytes.readUInt32LE(start + 4) !== 24000 ||
        bytes.readUInt32LE(start + 8) !== 48000 ||
        bytes.readUInt16LE(start + 12) !== 2 ||
        bytes.readUInt16LE(start + 14) !== 16
      )
        throw invalid();
      formatSeen = true;
    } else if (name === "data") {
      if (!formatSeen || dataSeen || size === 0 || size % 2 !== 0) throw invalid();
      dataSeen = true;
    }
    offset = next;
  }
  if (!formatSeen || !dataSeen) throw invalid();
}

export class FlowSpeechClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAudioBytes: number;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  constructor(private readonly options: Options) {
    if (typeof options.apiKey !== "string" || !options.apiKey || /[^\x21-\x7e]/.test(options.apiKey))
      throw new Error("Set FLOWSPEECH_API_KEY to a developer API key without whitespace");
    const base = safeUrl(options.baseUrl ?? "https://flowspeech.io", true);
    if (base.pathname !== "/" || base.search) throw new Error("API base URL must be an origin without a path or query");
    this.baseUrl = base.origin;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.maxAudioBytes = options.maxAudioBytes ?? 100 * 1024 * 1024;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 7_200_000)
      throw new Error("Timeout must be between 1 and 7200000 milliseconds");
    if (!Number.isSafeInteger(this.maxAudioBytes) || this.maxAudioBytes < 1)
      throw new Error("Invalid audio size limit");
    this.fetcher = options.fetch ?? fetch;
    this.now = options.now ?? (() => performance.now());
    this.sleep =
      options.sleep ??
      (async (ms, signal) => {
        await delay(ms, undefined, { signal });
      });
  }
  private context(signal?: AbortSignal, requestId?: string): Context {
    return { deadline: this.now() + this.timeoutMs, signal, requestId };
  }
  private remaining(context: Context): number {
    if (context.signal?.aborted) throw new Error("Operation stopped; this does not cancel the server job");
    const remaining = context.deadline - this.now();
    if (remaining <= 0) throw new Error("Operation timed out; this does not cancel the server job");
    return remaining;
  }
  private async pause(ms: number, context: Context): Promise<void> {
    if (ms >= this.remaining(context))
      throw new Error("Required wait exceeds the timeout; resume the existing request or job later");
    await this.sleep(ms, context.signal);
    this.remaining(context);
  }
  private signal(context: Context, requestLimit: number): AbortSignal {
    const timeout = AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(requestLimit, this.remaining(context)))));
    return context.signal ? AbortSignal.any([timeout, context.signal]) : timeout;
  }
  private async api(
    path: string,
    context: Context,
    body?: unknown,
  ): Promise<{ data: Record<string, unknown>; headers: Headers }> {
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    for (let attempt = 0; attempt < 5; attempt++) {
      this.remaining(context);
      let response: Response | undefined;
      let raw: Uint8Array;
      const fallback = Math.max(body === undefined ? 5000 : 1000, 1000 * 2 ** attempt);
      try {
        const signal = this.signal(context, 30_000);
        response = await this.fetcher(this.baseUrl + path, {
          method: body === undefined ? "GET" : "POST",
          redirect: "manual",
          credentials: "omit",
          signal,
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            ...(encoded === undefined
              ? {}
              : { "Content-Type": "application/json", "Idempotency-Key": context.requestId! }),
          },
          body: encoded,
        });
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel();
          throw new InvalidResponse("Unexpected API redirect refused");
        }
        raw = await boundedBody(response, 1024 * 1024, signal);
      } catch (error) {
        this.remaining(context);
        if (error instanceof InvalidResponse) throw error;
        if (response && !response.ok && !TRANSIENT.has(response.status))
          throw new Error(`FlowSpeech HTTP ${response.status}: unreadable error response`);
        if (attempt === 4) throw new Error("API transport failed after bounded retries");
        // A received Retry-After still applies if reading that response's body fails.
        await this.pause(retryDelay(response?.headers, fallback), context);
        continue;
      }
      this.remaining(context);
      let data: Record<string, unknown> | undefined;
      try {
        data = object(JSON.parse(new TextDecoder().decode(raw)));
      } catch {
        /* Error responses may not be JSON. */
      }
      if (response.ok) {
        if (!data) throw new InvalidResponse("API returned invalid JSON");
        return { data, headers: response.headers };
      }
      const error = data?.error && typeof data.error === "object" ? (data.error as Record<string, unknown>) : {};
      if (TRANSIENT.has(response.status) && error.retryable !== false && attempt < 4) {
        await this.pause(retryDelay(response.headers, fallback), context);
        continue;
      }
      const code =
        typeof error.code === "string" && /^[a-zA-Z0-9_]{1,100}$/.test(error.code) ? error.code : "api_error";
      throw new Error(`FlowSpeech HTTP ${response.status}: ${code}`);
    }
    throw new Error("API retry budget exhausted");
  }
  private job(data: Record<string, unknown>, expected: { jobId?: string; requestId?: string }): Job {
    const id = validateId(data.id),
      requestId = validateId(data.requestId);
    if (expected.jobId && id !== expected.jobId) throw new InvalidResponse("Status response changed the job ID");
    if (expected.requestId && requestId !== expected.requestId)
      throw new InvalidResponse("Response changed the request ID");
    if (typeof data.status !== "string" || (!PENDING.has(data.status) && !TERMINAL.has(data.status)))
      throw new InvalidResponse("API returned an invalid job status");
    const usage = object(data.usage);
    if (!["billableCharacters", "reservedCredits", "chargedCredits"].every((key) => counter(usage[key])))
      throw new InvalidResponse("Invalid job usage");
    if (data.resultDeleted !== undefined && typeof data.resultDeleted !== "boolean")
      throw new InvalidResponse("Invalid deleted-result flag");
    if (data.status === "success") {
      if (data.resultDeleted === true) {
        if (data.result !== null) throw new InvalidResponse("Deleted job must have a null audio result");
      } else {
        if (!data.result) throw new InvalidResponse("Completed job has no audio result");
        const result = object(data.result);
        if (
          typeof result.url !== "string" ||
          result.mimeType !== "audio/wav" ||
          result.sampleRate !== 24000 ||
          result.channels !== 1 ||
          result.bitsPerSample !== 16 ||
          result.access !== "link"
        )
          throw new InvalidResponse("Invalid audio result metadata");
        safeUrl(result.url, new URL(this.baseUrl).protocol === "http:");
      }
    }
    if (data.error !== undefined) {
      const error = object(data.error);
      if (typeof error.code !== "string" || !/^[a-zA-Z0-9_]{1,100}$/.test(error.code))
        throw new InvalidResponse("Invalid job error code");
    }
    return { ...data, id, requestId } as unknown as Job;
  }
  async quota(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const data = (await this.api("/api/v1/quota", this.context(signal))).data;
    const quota = object(data.quota);
    if (!["total", "remaining", "reserved", "available"].every((key) => counter(quota[key])))
      throw new InvalidResponse("Invalid quota response");
    return data;
  }
  async voices(signal?: AbortSignal): Promise<Voice[]> {
    const data = (await this.api("/api/v1/voices", this.context(signal))).data;
    if (
      !Array.isArray(data.voices) ||
      data.voices.some(
        (v) =>
          !v ||
          typeof v.name !== "string" ||
          !v.name.trim() ||
          typeof v.description !== "string" ||
          typeof v.gender !== "string",
      )
    )
      throw new InvalidResponse("Invalid voices response");
    return data.voices as Voice[];
  }
  async getJob(id: string, signal?: AbortSignal): Promise<Job> {
    const jobId = validateId(id);
    return this.job((await this.api(`/api/v1/tts/jobs/${jobId}`, this.context(signal))).data, { jobId });
  }
  async findJob(id: string, signal?: AbortSignal): Promise<Job> {
    const requestId = validateId(id);
    return this.job((await this.api(`/api/v1/tts/jobs?requestId=${requestId}`, this.context(signal))).data, {
      requestId,
    });
  }
  async generate(
    input: SpeechInput,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<{ job: Job; audio: Uint8Array; requestId: string }> {
    requestId = validateId(requestId);
    const context = this.context(signal, requestId);
    try {
      const validated = speechInput(input);
      let result = await this.api("/api/v1/tts/jobs", context, { input: validated });
      let job = this.job(result.data, { requestId });
      context.jobId = job.id;
      while (PENDING.has(job.status)) {
        await this.pause(retryDelay(result.headers, 5000), context);
        result = await this.api(`/api/v1/tts/jobs/${context.jobId}`, context);
        job = this.job(result.data, { jobId: context.jobId, requestId });
      }
      if (job.status !== "success")
        throw new Error(`Generation ${job.status}${job.error ? ": " + job.error.code : ""}`);
      if (job.resultDeleted) throw new Error("Audio result was deleted");
      const url = safeUrl(job.result!.url, new URL(this.baseUrl).protocol === "http:");
      // Downloads have no API credentials and never follow redirects.
      const downloadSignal = this.signal(context, 120_000);
      const audioResponse = await this.fetcher(url.toString(), {
        redirect: "manual",
        credentials: "omit",
        signal: downloadSignal,
      });
      if (audioResponse.status !== 200) {
        await audioResponse.body?.cancel();
        throw new Error(`Audio download HTTP ${audioResponse.status}; retry this download, not generation`);
      }
      const audio = await boundedBody(audioResponse, this.maxAudioBytes, downloadSignal);
      this.remaining(context);
      validateWav(audio);
      this.remaining(context);
      return { job, audio, requestId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operation failed";
      throw new Error(
        `${message.split(this.options.apiKey).join("[redacted]")}; requestId=${requestId}${context.jobId ? `; jobId=${context.jobId}` : ""}`,
      );
    }
  }
}
