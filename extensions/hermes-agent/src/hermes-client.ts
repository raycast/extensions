/**
 * HTTP/SSE transport for the Hermes API server.
 *
 * This module has no @raycast/api imports on purpose: the transport layer can
 * be exercised outside Raycast (plain Node) against a live Hermes instance.
 * Everything Raycast-specific lives in api.ts and the command files.
 *
 * Endpoint reference: gateway/platforms/api_server.py in
 * https://github.com/NousResearch/hermes-agent (see also GET /v1/capabilities).
 */

export interface HermesConfig {
  endpoint: string;
  token: string;
  modelName?: string;
  profile?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionSummary {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  message_count: number;
  tool_call_count: number;
  started_at: number | null;
  last_active: number | null;
  preview: string | null;
  parent_session_id: string | null;
}

export interface SessionMessage {
  id: number;
  role: string;
  content: string | null;
  tool_calls: { function?: { name?: string; arguments?: string } }[] | null;
  tool_name: string | null;
  timestamp: number | null;
}

export interface ToolActivity {
  state: "started" | "completed" | "failed";
  toolName: string;
  preview?: string;
}

export interface StreamCallbacks {
  onDelta?: (chunk: string) => void;
  onTool?: (activity: ToolActivity) => void;
}

export interface StreamResult {
  content: string;
  sessionId: string;
}

export interface CompletionResult {
  content: string;
  sessionId: string | null;
}

export interface HealthBasic {
  status?: string;
  version?: string;
  platform?: string;
}

export interface ReadinessCheck {
  status?: string;
  [key: string]: unknown;
}

export interface HealthDetailed extends HealthBasic {
  gateway_state?: string | null;
  active_agents?: number;
  platforms?: Record<string, { state?: string; error_message?: string | null }>;
  readiness?: { status?: string; checks?: Record<string, ReadinessCheck> };
}

export interface Capabilities {
  model?: string;
  features?: Record<string, unknown>;
  runtime?: { mode?: string; tool_execution?: string };
}

export class HermesApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HermesApiError";
    this.status = status;
  }
}

const QUICK_TIMEOUT_MS = 10_000;
const RUN_TIMEOUT_MS = 10 * 60_000;
const STREAM_IDLE_TIMEOUT_MS = 120_000;

function baseUrl(config: HermesConfig): string {
  const base = config.endpoint.replace(/\/+$/, "");
  if (config.profile) {
    return `${base}/p/${encodeURIComponent(config.profile)}`;
  }
  return base;
}

function authHeaders(config: HermesConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.token}` };
}

async function toApiError(response: Response): Promise<HermesApiError> {
  let detail = "";
  try {
    const body = await response.text();
    try {
      detail = JSON.parse(body)?.error?.message || body;
    } catch {
      detail = body;
    }
  } catch {
    // Body unreadable; fall through to the status-only message.
  }
  if (response.status === 429) {
    return new HermesApiError(
      "Hermes is at its concurrent run limit. Try again in a moment.",
      429,
    );
  }
  const suffix = detail ? ` - ${detail.slice(0, 300)}` : "";
  return new HermesApiError(
    `API error: ${response.status}${suffix}`,
    response.status,
  );
}

async function quickJson<T>(
  config: HermesConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${baseUrl(config)}${path}`, {
    ...init,
    headers: {
      ...authHeaders(config),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(QUICK_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

interface SSEEvent {
  name: string;
  data: string;
}

/**
 * Minimal SSE reader. Handles named events (`event:` + `data:` pairs, used by
 * /api/sessions/{id}/chat/stream), plain `data:` events (OpenAI-style
 * /v1/chat/completions), comment keepalives (`: keepalive`), and multi-line
 * data. Aborts if the connection goes silent for longer than the server's
 * keepalive interval allows.
 */
async function readSSE(
  response: Response,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Streaming response had no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];
  let idleCancelled = false;

  const dispatch = () => {
    if (dataLines.length > 0) {
      onEvent({ name: eventName, data: dataLines.join("\n") });
    }
    eventName = "message";
    dataLines = [];
  };

  for (;;) {
    const idleTimer = setTimeout(() => {
      idleCancelled = true;
      reader.cancel().catch(() => undefined);
    }, STREAM_IDLE_TIMEOUT_MS);
    let result;
    try {
      result = await reader.read();
    } finally {
      clearTimeout(idleTimer);
    }
    if (result.done) {
      break;
    }

    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line === "") {
        dispatch();
      } else if (line.startsWith(":")) {
        // Keepalive comment.
      } else if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
  }
  dispatch();

  if (idleCancelled) {
    throw new Error(
      `Stream went silent for ${STREAM_IDLE_TIMEOUT_MS / 1000}s and was closed`,
    );
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/**
 * One agent turn on a server-side session, streamed over SSE with live tool
 * activity. The session must already exist (see createSession / listSessions).
 */
export async function streamSessionChat(
  config: HermesConfig,
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks = {},
): Promise<StreamResult> {
  const response = await fetch(
    `${baseUrl(config)}/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
    {
      method: "POST",
      headers: { ...authHeaders(config), "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }

  let streamed = "";
  let finalContent = "";
  let effectiveSessionId =
    response.headers.get("X-Hermes-Session-Id") || sessionId;
  let errorMessage: string | null = null;

  await readSSE(response, (event) => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return;
    }
    switch (event.name) {
      case "assistant.delta": {
        const delta = typeof payload.delta === "string" ? payload.delta : "";
        if (delta) {
          streamed += delta;
          callbacks.onDelta?.(delta);
        }
        break;
      }
      case "tool.started":
      case "tool.completed":
      case "tool.failed": {
        callbacks.onTool?.({
          state: event.name.slice("tool.".length) as ToolActivity["state"],
          toolName:
            typeof payload.tool_name === "string" && payload.tool_name
              ? payload.tool_name
              : "tool",
          preview:
            typeof payload.preview === "string" ? payload.preview : undefined,
        });
        break;
      }
      case "assistant.completed": {
        if (typeof payload.content === "string" && payload.content) {
          finalContent = payload.content;
        }
        if (typeof payload.session_id === "string" && payload.session_id) {
          effectiveSessionId = payload.session_id;
        }
        break;
      }
      case "error": {
        errorMessage =
          typeof payload.message === "string"
            ? payload.message
            : "Agent run failed";
        break;
      }
    }
  });

  if (errorMessage && !finalContent && !streamed) {
    throw new Error(errorMessage);
  }
  return { content: finalContent || streamed, sessionId: effectiveSessionId };
}

/**
 * OpenAI-style /v1/chat/completions. Used for one-shot commands and for the
 * first turn of conversations created before server-side sessions existed
 * (the reply carries X-Hermes-Session-Id, which later turns continue).
 */
export async function chatCompletion(
  config: HermesConfig,
  messages: ChatMessage[],
  options: { onDelta?: (chunk: string) => void } = {},
): Promise<CompletionResult> {
  const response = await fetch(`${baseUrl(config)}/v1/chat/completions`, {
    method: "POST",
    headers: { ...authHeaders(config), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.modelName || "hermes-agent",
      messages,
      stream: Boolean(options.onDelta),
    }),
    signal: options.onDelta ? undefined : AbortSignal.timeout(RUN_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const sessionId = response.headers.get("X-Hermes-Session-Id");

  if (options.onDelta && response.body) {
    let content = "";
    await readSSE(response, (event) => {
      if (event.data === "[DONE]") {
        return;
      }
      try {
        const parsed = JSON.parse(event.data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          options.onDelta?.(delta);
        }
      } catch {
        // Skip unparseable lines.
      }
    });
    return { content, sessionId };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { content: data.choices?.[0]?.message?.content || "", sessionId };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function listSessions(
  config: HermesConfig,
  options: { limit?: number; source?: string } = {},
): Promise<SessionSummary[]> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 100) });
  if (options.source) {
    params.set("source", options.source);
  }
  const data = await quickJson<{ data?: SessionSummary[] }>(
    config,
    `/api/sessions?${params}`,
  );
  return data.data ?? [];
}

export async function createSession(config: HermesConfig): Promise<string> {
  const data = await quickJson<{ session?: { id?: string } }>(
    config,
    "/api/sessions",
    { method: "POST", body: "{}" },
  );
  const id = data.session?.id;
  if (!id) {
    throw new Error("Session create returned no id");
  }
  return id;
}

export async function getSessionMessages(
  config: HermesConfig,
  sessionId: string,
  limit = 200,
): Promise<SessionMessage[]> {
  const data = await quickJson<{ data?: SessionMessage[] }>(
    config,
    `/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=${limit}`,
  );
  return data.data ?? [];
}

export async function renameSession(
  config: HermesConfig,
  sessionId: string,
  title: string,
): Promise<void> {
  await quickJson(config, `/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteSession(
  config: HermesConfig,
  sessionId: string,
): Promise<void> {
  await quickJson(config, `/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function forkSession(
  config: HermesConfig,
  sessionId: string,
): Promise<string> {
  const data = await quickJson<{ session?: { id?: string } }>(
    config,
    `/api/sessions/${encodeURIComponent(sessionId)}/fork`,
    { method: "POST", body: "{}" },
  );
  const id = data.session?.id;
  if (!id) {
    throw new Error("Session fork returned no id");
  }
  return id;
}

// ---------------------------------------------------------------------------
// Health / discovery
// ---------------------------------------------------------------------------

export async function getHealth(config: HermesConfig): Promise<HealthBasic> {
  return quickJson<HealthBasic>(config, "/health");
}

export async function getHealthDetailed(
  config: HermesConfig,
): Promise<HealthDetailed> {
  return quickJson<HealthDetailed>(config, "/health/detailed");
}

export async function getCapabilities(
  config: HermesConfig,
): Promise<Capabilities> {
  return quickJson<Capabilities>(config, "/v1/capabilities");
}

// ---------------------------------------------------------------------------
// Runs (async agent tasks with SSE lifecycle events)
// ---------------------------------------------------------------------------

export interface RunStatus {
  object: string;
  run_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  session_id?: string;
  model?: string;
  last_event?: string;
  error?: string;
}

export interface RunSubmitResult {
  run_id: string;
  status: string;
}

export type ApprovalChoice = "once" | "session" | "always" | "deny";

export interface ApprovalRequest {
  command: string;
  choices: ApprovalChoice[];
  smart_denied?: boolean;
  allow_permanent?: boolean;
}

export interface RunEventCallback {
  onDelta?: (delta: string) => void;
  onToolStarted?: (tool: string, preview?: string) => void;
  onToolCompleted?: (tool: string, duration?: number, error?: boolean) => void;
  onApproval?: (request: ApprovalRequest) => void;
  onReasoning?: (text: string) => void;
  onCompleted?: (output: string) => void;
  onFailed?: (error: string) => void;
}

/**
 * Submit an async agent run. Returns the run_id immediately; subscribe to
 * /v1/runs/{run_id}/events for lifecycle. The SSE stream emits:
 *   message.delta, tool.started, tool.completed, reasoning.available,
 *   approval.request, approval.responded, run.completed, run.failed
 */
export async function submitRun(
  config: HermesConfig,
  input: string,
  options: { instructions?: string; sessionKey?: string } = {},
): Promise<RunSubmitResult> {
  const headers: Record<string, string> = {
    ...authHeaders(config),
    "Content-Type": "application/json",
  };
  if (options.sessionKey) {
    headers["X-Hermes-Session-Key"] = options.sessionKey;
  }
  const body = JSON.stringify({
    input,
    instructions: options.instructions,
  });
  const response = await fetch(`${baseUrl(config)}/v1/runs`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(QUICK_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as RunSubmitResult;
}

/**
 * Subscribe to a run's SSE event stream. Resolves when the run completes
 * or fails. Calls callbacks for each event type as they arrive.
 */
export async function subscribeRunEvents(
  config: HermesConfig,
  runId: string,
  callbacks: RunEventCallback = {},
): Promise<{ output: string; error: string | null }> {
  const response = await fetch(
    `${baseUrl(config)}/v1/runs/${encodeURIComponent(runId)}/events`,
    { headers: authHeaders(config) },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }

  let output = "";
  let error: string | null = null;

  await readSSE(response, (event) => {
    if (event.data === "[DONE]" || event.data === "stream closed") {
      return;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return;
    }
    const eventType = typeof payload.event === "string" ? payload.event : "";
    switch (eventType) {
      case "message.delta": {
        const delta = typeof payload.delta === "string" ? payload.delta : "";
        if (delta) {
          output += delta;
          callbacks.onDelta?.(delta);
        }
        break;
      }
      case "tool.started":
        callbacks.onToolStarted?.(
          typeof payload.tool === "string" ? payload.tool : "",
          typeof payload.preview === "string" ? payload.preview : undefined,
        );
        break;
      case "tool.completed":
        callbacks.onToolCompleted?.(
          typeof payload.tool === "string" ? payload.tool : "",
          typeof payload.duration === "number" ? payload.duration : undefined,
          Boolean(payload.error),
        );
        break;
      case "reasoning.available":
        callbacks.onReasoning?.(
          typeof payload.text === "string" ? payload.text : "",
        );
        break;
      case "approval.request":
        callbacks.onApproval?.({
          command: typeof payload.command === "string" ? payload.command : "",
          choices: Array.isArray(payload.choices)
            ? (payload.choices as ApprovalChoice[])
            : ["once", "session", "always", "deny"],
          smart_denied: Boolean(payload.smart_denied),
          allow_permanent: payload.allow_permanent !== false,
        });
        break;
      case "run.completed":
        if (typeof payload.output === "string") {
          output = payload.output;
          callbacks.onCompleted?.(payload.output);
        }
        break;
      case "run.failed":
        error =
          typeof payload.error === "string" ? payload.error : "Run failed";
        callbacks.onFailed?.(error);
        break;
    }
  });

  return { output, error };
}

/**
 * Resolve a pending approval on a run. Choice is one of: once, session,
 * always, deny. The run resumes (or stays denied) after the server
 * processes the resolution.
 */
export async function resolveApproval(
  config: HermesConfig,
  runId: string,
  choice: ApprovalChoice,
): Promise<void> {
  const response = await fetch(
    `${baseUrl(config)}/v1/runs/${encodeURIComponent(runId)}/approval`,
    {
      method: "POST",
      headers: { ...authHeaders(config), "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
}

/** Stop a running agent run. */
export async function stopRun(
  config: HermesConfig,
  runId: string,
): Promise<void> {
  const response = await fetch(
    `${baseUrl(config)}/v1/runs/${encodeURIComponent(runId)}/stop`,
    {
      method: "POST",
      headers: { ...authHeaders(config), "Content-Type": "application/json" },
      body: "{}",
    },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
}

/** Poll a run's status (alternative to SSE for clients that can't stream). */
export async function getRunStatus(
  config: HermesConfig,
  runId: string,
): Promise<RunStatus> {
  return quickJson<RunStatus>(config, `/v1/runs/${encodeURIComponent(runId)}`);
}

// ---------------------------------------------------------------------------
// Skills and toolsets
// ---------------------------------------------------------------------------

export interface SkillSummary {
  name: string;
  description: string;
  category: string | null;
}

export interface ToolsetSummary {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  tools: string[];
}

export async function listSkills(
  config: HermesConfig,
): Promise<SkillSummary[]> {
  const data = await quickJson<{ data?: SkillSummary[] }>(config, "/v1/skills");
  return data.data ?? [];
}

export async function listToolsets(
  config: HermesConfig,
): Promise<ToolsetSummary[]> {
  const data = await quickJson<{ data?: ToolsetSummary[] }>(
    config,
    "/v1/toolsets",
  );
  return data.data ?? [];
}

// ---------------------------------------------------------------------------
// Cron jobs
// ---------------------------------------------------------------------------

export interface CronJobSchedule {
  kind: string;
  expr?: string;
  run_at?: string;
  display: string;
}

export interface CronJob {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  skill: string | null;
  model: string | null;
  provider: string | null;
  schedule: CronJobSchedule;
  schedule_display: string;
  repeat: { times: number | null; completed: number };
  enabled: boolean;
  state: string;
  paused_at: string | null;
  paused_reason: string | null;
  created_at: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_delivery_error: string | null;
  deliver: string;
  no_agent: boolean;
  script: string | null;
}

export interface CronJobCreateInput {
  name: string;
  schedule: string;
  prompt: string;
  deliver?: string;
  skills?: string[];
  repeat?: number;
}

export interface CronJobUpdateInput {
  name?: string;
  schedule?: string;
  prompt?: string;
  deliver?: string;
  skills?: string[];
  enabled?: boolean;
}

export async function listCronJobs(
  config: HermesConfig,
  options: { includeDisabled?: boolean } = {},
): Promise<CronJob[]> {
  const params = new URLSearchParams();
  if (options.includeDisabled) {
    params.set("include_disabled", "true");
  }
  const query = params.toString();
  const data = await quickJson<{ jobs?: CronJob[] }>(
    config,
    `/api/jobs${query ? `?${query}` : ""}`,
  );
  return data.jobs ?? [];
}

export async function createCronJob(
  config: HermesConfig,
  input: CronJobCreateInput,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(config, "/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!data.job) {
    throw new Error("Job create returned no job");
  }
  return data.job;
}

export async function getCronJob(
  config: HermesConfig,
  jobId: string,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(
    config,
    `/api/jobs/${encodeURIComponent(jobId)}`,
  );
  if (!data.job) {
    throw new Error("Job not found");
  }
  return data.job;
}

export async function updateCronJob(
  config: HermesConfig,
  jobId: string,
  fields: CronJobUpdateInput,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(
    config,
    `/api/jobs/${encodeURIComponent(jobId)}`,
    { method: "PATCH", body: JSON.stringify(fields) },
  );
  if (!data.job) {
    throw new Error("Job update returned no job");
  }
  return data.job;
}

export async function deleteCronJob(
  config: HermesConfig,
  jobId: string,
): Promise<void> {
  await quickJson(config, `/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

export async function pauseCronJob(
  config: HermesConfig,
  jobId: string,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(
    config,
    `/api/jobs/${encodeURIComponent(jobId)}/pause`,
    { method: "POST", body: "{}" },
  );
  if (!data.job) {
    throw new Error("Pause returned no job");
  }
  return data.job;
}

export async function resumeCronJob(
  config: HermesConfig,
  jobId: string,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(
    config,
    `/api/jobs/${encodeURIComponent(jobId)}/resume`,
    { method: "POST", body: "{}" },
  );
  if (!data.job) {
    throw new Error("Resume returned no job");
  }
  return data.job;
}

export async function triggerCronJob(
  config: HermesConfig,
  jobId: string,
): Promise<CronJob> {
  const data = await quickJson<{ job?: CronJob }>(
    config,
    `/api/jobs/${encodeURIComponent(jobId)}/run`,
    { method: "POST", body: "{}" },
  );
  if (!data.job) {
    throw new Error("Trigger returned no job");
  }
  return data.job;
}
