import { logger } from "@chrismessina/raycast-logger";
import { Cache, getApplications, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function baseUrl(): string {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const url = (baseUrl?.trim() || "http://localhost:1337").replace(/\/+$/, "").replace(/\/v1$/, "");
  // "localhost:1337" without a scheme is a common way to type it; URL() would misread it.
  return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

export class ServerDownError extends Error {
  constructor() {
    super("The Osaurus server isn't running");
  }
}

export class HttpError extends Error {
  constructor(readonly status: number) {
    // Status only: the body can echo request details we don't want in a toast.
    super(`Osaurus returned HTTP ${status}`);
  }
}

// fetch() rejects with a TypeError whose cause is ECONNREFUSED when nothing listens on the port.
async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  const method = init?.method ?? "GET";
  const done = logger.time(`${method} ${path}`);
  try {
    res = await fetch(`${baseUrl()}${path}`, init);
  } catch (error) {
    // An abort is deliberate (Stop, or dev mode's double-mounted effect), not a failure.
    if (error instanceof Error && error.name === "AbortError") {
      logger.log(`${method} ${path} aborted`);
      throw error;
    }
    logger.warn(`${method} ${path} failed`, error);
    if (error instanceof Error && error.name === "TimeoutError") throw new Error("Osaurus didn't respond in time");
    throw new ServerDownError();
  }
  done({ status: res.status });
  if (!res.ok) throw new HttpError(res.status);
  return res;
}

export interface Model {
  id: string;
  family: string;
  format: string;
  parameterSize: string;
  quantization: string;
}

interface TagsResponse {
  models: {
    id: string;
    details: { family: string; format: string; parameter_size: string; quantization_level: string };
  }[];
}

export async function listModels(): Promise<Model[]> {
  const res = await request("/api/tags", { signal: AbortSignal.timeout(10_000) });
  const { models } = (await res.json()) as TagsResponse;
  return models.map((m) => ({
    id: m.id,
    family: m.details.family,
    format: m.details.format,
    parameterSize: m.details.parameter_size,
    quantization: m.details.quantization_level,
  }));
}

export interface ModelInfo {
  capabilities: string[];
  contextLength?: number;
  parameters?: string;
  // model_info's general.name, e.g. "Apple Foundation Model" for foundation.
  name?: string;
}

interface ShowResponse {
  capabilities?: string[];
  model_info?: Record<string, unknown>;
  parameters?: string;
}

// Throws for models Osaurus can't chat with, such as embedding models.
export async function showModel(id: string): Promise<ModelInfo> {
  const res = await request("/api/show", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: id }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json()) as ShowResponse;
  const contextKey = Object.keys(body.model_info ?? {}).find((k) => k.endsWith(".context_length"));
  const contextLength = contextKey ? Number(body.model_info?.[contextKey]) : undefined;
  return {
    capabilities: body.capabilities ?? [],
    contextLength: contextLength || undefined,
    parameters: body.parameters || undefined,
    name: typeof body.model_info?.["general.name"] === "string" ? body.model_info["general.name"] : undefined,
  };
}

// Models that can chat: /api/show rejects embedding models, or omits "completion" for them.
export async function listChatModels(): Promise<(Model & ModelInfo)[]> {
  const models = await listModels();
  const results = await Promise.all(
    models.map(async (m) => {
      try {
        return { ...m, ...(await showModel(m.id)) };
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return undefined; // not a chat model
        throw error; // server down or timed out: don't silently drop the model
      }
    }),
  );
  const chat = results.filter((m): m is Model & ModelInfo => !!m?.capabilities.includes("completion"));
  logger.log("Chat models", { all: models.map((m) => m.id), chat: chat.map((m) => m.id) });
  return chat;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Streams an OpenAI-compatible chat completion, calling onDelta with each content chunk.
export async function streamChat(
  model: string,
  messages: ChatMessage[],
  onDelta: (text: string, kind: "content" | "reasoning") => void,
  signal: AbortSignal,
  // Osaurus groups requests with the same session_id into one chat in its history.
  sessionId?: string,
): Promise<void> {
  const log = logger.child("[stream]");
  let reasoningChunks = 0;
  let contentChunks = 0;
  signal.addEventListener("abort", () => log.log("Aborted", { model, reasoningChunks, contentChunks }));
  const res = await request("/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, session_id: sessionId }),
    signal,
  });
  if (!res.body) throw new Error("Osaurus returned an empty response");

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        // Osaurus always ends a complete stream with this.
        log.log("Done", { model, reasoningChunks, contentChunks });
        return;
      }
      type Chunk = { choices?: { delta?: { content?: string; reasoning_content?: string } }[] };
      const delta = (JSON.parse(data) as Chunk).choices?.[0]?.delta;
      // Thinking models stream reasoning_content first; content only arrives at the end.
      if (delta?.reasoning_content) {
        if (reasoningChunks++ === 0) log.log("First reasoning chunk", { model });
        onDelta(delta.reasoning_content, "reasoning");
      }
      if (delta?.content) {
        if (contentChunks++ === 0) log.log("First content chunk", { model });
        onDelta(delta.content, "content");
      }
    }
  }
  log.warn("Stream ended without [DONE]", { model, reasoningChunks, contentChunks });
  throw new Error("Osaurus stopped responding before the answer finished");
}

// With a stable and a beta build installed, both can run at once and either may own the port.
// Everything below works from the app that actually serves, so restarts and links reach it.
const APP_PATTERN = /^(\/.+?\.app)\/Contents\/MacOS\/osaurus(?:\s|$)/i;
const cache = new Cache();
const SERVER_APP_KEY = "server-app";

export async function runningApps(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
    return stdout.split("\n").flatMap((line) => line.match(APP_PATTERN)?.[1] ?? []);
  } catch (error) {
    logger.warn("Couldn't list processes to find Osaurus", error);
    return [];
  }
}

// The app listening on the server's port, remembered so a restart after Stop picks the same build.
// Process discovery and app control only make sense when the server URL points at this Mac.
export function isLocalServer(): boolean {
  const { hostname } = new URL(baseUrl());
  return hostname === "localhost" || hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

export async function serverApp(): Promise<string | undefined> {
  if (!isLocalServer()) return undefined;
  try {
    const url = new URL(baseUrl());
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const { stdout: pids } = await execFileAsync("/usr/sbin/lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    for (const pid of new Set(pids.trim().split("\n"))) {
      const { stdout } = await execFileAsync("/bin/ps", ["-p", pid, "-o", "command="]);
      const app = stdout.trim().match(APP_PATTERN)?.[1];
      if (app) {
        cache.set(SERVER_APP_KEY, app);
        return app;
      }
    }
  } catch {
    // lsof exits 1 when nothing listens
  }
  return undefined;
}

// The Osaurus app to open or relaunch, in order: the one open now (the build that served last,
// if it's among them), then the one picked in preferences, then the one that served last, then any
// installed build, stable first. Never the osaurus:// scheme: a bare osaurus:// link is routed as an
// agent pairing link and opens the Agents tab.
export async function appToStart(): Promise<string | undefined> {
  const last = cache.get(SERVER_APP_KEY);
  const running = await runningApps();
  if (last && running.includes(last)) return last;
  if (running.length > 0) return running[0];
  const picked = getPreferenceValues<Preferences>().osaurusApp?.path;
  if (picked && existsSync(picked)) return picked;
  if (last && existsSync(last)) return last;
  const apps = await getApplications().catch((error) => {
    logger.warn("Couldn't list installed apps", error);
    return [];
  });
  const installed = apps.filter((a) => a.bundleId?.startsWith("com.dinoki.osaurus"));
  return (installed.find((a) => a.bundleId === "com.dinoki.osaurus") ?? installed[0])?.path;
}

export class OsaurusNotFoundError extends Error {
  constructor() {
    super("Install Osaurus from osaurus.ai, or choose it in the extension's preferences.");
  }
}

// Osaurus starts its server when the app launches, and has no hook to restart it in a running app:
// `osaurus serve` spawns a second app instance, and `osaurus stop` leaves the app open with no server.
// So stopping means quitting the app, and starting means launching it.
export async function quitApp(app: string): Promise<void> {
  const name = app.replace(/[\\"]/g, "\\$&");
  await execFileAsync("/usr/bin/osascript", ["-e", `tell application "${name}" to quit`], { timeout: 15_000 });
  for (let i = 0; i < 20; i++) {
    if (!(await runningApps()).includes(app)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Osaurus didn't quit");
}
