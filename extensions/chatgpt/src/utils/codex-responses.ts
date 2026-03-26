import { Agent, IncomingMessage } from "node:http";
import * as https from "node:https";
import { Message } from "../type";

const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";

interface CodexInputMessage {
  role: "system" | "user" | "assistant";
  content: CodexInputContent[];
}

interface CodexRequestBody {
  model: string;
  input: CodexInputMessage[];
  instructions: string;
  reasoning?: {
    effort: "low" | "medium" | "high";
  };
  store: boolean;
  stream: boolean;
}

type CodexInputContent =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_image";
      image_url: string;
    };

export interface CodexResponseParams {
  accessToken: string;
  accountId: string;
  model: string;
  messages: Message[];
  instructions?: string;
  stream: boolean;
  signal?: AbortSignal;
  httpAgent?: Agent;
  onDelta?: (delta: string) => void;
}

interface CodexHttpResponse {
  statusCode: number;
  statusText: string;
  stream: IncomingMessage;
}

export async function requestCodexResponse(params: CodexResponseParams): Promise<string> {
  const instructions = resolveInstructions(params.instructions, params.messages);

  const body: CodexRequestBody = {
    model: params.model.trim() || "gpt-5.2",
    input: mapMessagesToCodexInput(params.messages),
    instructions,
    store: false,
    stream: params.stream,
  };

  if (supportsReasoningEffort(body.model)) {
    body.reasoning = { effort: "medium" };
  }

  const payload = JSON.stringify(body);
  const response = await postCodexRequest({
    payload,
    accessToken: params.accessToken,
    accountId: params.accountId,
    stream: params.stream,
    signal: params.signal,
    httpAgent: params.httpAgent,
  });

  if (!isHttpSuccess(response.statusCode)) {
    throw new Error(await parseCodexError(response));
  }

  if (!params.stream) {
    const raw = await readIncomingMessageText(response.stream);
    const parsed = parseNonStreamText(raw);
    return parsed ?? "";
  }

  return readStreamingText(response.stream, params.onDelta);
}

export function isCodexUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("(401)") || message.includes("unauthorized");
}

function postCodexRequest(options: {
  payload: string;
  accessToken: string;
  accountId: string;
  stream: boolean;
  signal?: AbortSignal;
  httpAgent?: Agent;
}): Promise<CodexHttpResponse> {
  const { payload, accessToken, accountId, stream, signal, httpAgent } = options;

  return new Promise((resolve, reject) => {
    const request = https.request(
      CODEX_RESPONSES_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "ChatGPT-Account-ID": accountId,
          "Content-Type": "application/json",
          Accept: stream ? "text/event-stream" : "application/json",
          "Accept-Encoding": "identity",
          "Content-Length": Buffer.byteLength(payload).toString(),
        },
        agent: httpAgent,
      },
      (response) => {
        cleanupAbortHandler();
        resolve({
          statusCode: response.statusCode ?? 0,
          statusText: response.statusMessage ?? "",
          stream: response,
        });
      },
    );

    const onAbort = () => {
      request.destroy(new Error("AbortError"));
    };

    const cleanupAbortHandler = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    if (signal) {
      if (signal.aborted) {
        cleanupAbortHandler();
        reject(new Error("AbortError"));
        return;
      }

      signal.addEventListener("abort", onAbort, { once: true });
    }

    request.on("error", (error) => {
      cleanupAbortHandler();
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

function isHttpSuccess(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function supportsReasoningEffort(model: string): boolean {
  return model.startsWith("gpt-5");
}

function mapMessagesToCodexInput(messages: Message[]): CodexInputMessage[] {
  const input: CodexInputMessage[] = [];

  for (const message of messages) {
    const content = mapMessageContent(message.content);
    if (content.length === 0) {
      continue;
    }

    input.push({
      role: mapRole(message.role),
      content,
    });
  }

  return input;
}

function resolveInstructions(instructions: string | undefined, messages: Message[]): string {
  const normalized = instructions?.trim();
  if (normalized) {
    return normalized;
  }

  for (const message of messages) {
    if ((message.role === "system" || message.role === "developer") && typeof message.content === "string") {
      const systemInstructions = message.content.trim();
      if (systemInstructions) {
        return systemInstructions;
      }
    }
  }

  return "You are a helpful assistant.";
}

function mapRole(role: string): "system" | "user" | "assistant" {
  if (role === "assistant") {
    return "assistant";
  }

  if (role === "system" || role === "developer") {
    return "system";
  }

  return "user";
}

function mapMessageContent(content: Message["content"]): CodexInputContent[] {
  if (typeof content === "string") {
    const text = content.trim();
    return text ? [{ type: "input_text", text }] : [];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  const result: CodexInputContent[] = [];

  for (const part of content) {
    if (!part || typeof part !== "object" || !("type" in part) || typeof part.type !== "string") {
      continue;
    }

    if (part.type === "text" && "text" in part && typeof part.text === "string" && part.text.trim()) {
      result.push({ type: "input_text", text: part.text });
      continue;
    }

    if (part.type === "image_url" && "image_url" in part && part.image_url) {
      const imageURL =
        typeof part.image_url === "string"
          ? part.image_url
          : "url" in part.image_url && typeof part.image_url.url === "string"
            ? part.image_url.url
            : "";

      if (imageURL.trim()) {
        result.push({ type: "input_image", image_url: imageURL });
      }
    }
  }

  return result;
}

async function readStreamingText(stream: IncomingMessage, onDelta?: (delta: string) => void): Promise<string> {
  let pending = "";
  let deltaText = "";
  let completedText: string | null = null;

  for await (const chunk of stream) {
    pending += toUTF8(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseSSEDataLine(line);
      if (!event) {
        continue;
      }

      if (typeof event.delta === "string") {
        deltaText += event.delta;
        onDelta?.(event.delta);
      }

      if (event.type === "response.completed" && "response" in event) {
        const extracted = extractResponseText(event.response);
        if (extracted) {
          completedText = extracted;
        }
      }
    }
  }

  if (pending.trim()) {
    const event = parseSSEDataLine(pending);
    if (event && typeof event.delta === "string") {
      deltaText += event.delta;
      onDelta?.(event.delta);
    }
    if (event && event.type === "response.completed" && "response" in event) {
      const extracted = extractResponseText(event.response);
      if (extracted) {
        completedText = extracted;
      }
    }
  }

  const trimmedDelta = deltaText.trim();
  if (trimmedDelta) {
    return trimmedDelta;
  }

  return completedText?.trim() ?? "";
}

function parseSSEDataLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return null;
  }

  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseNonStreamText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const extracted = extractResponseText(parsed);
    if (extracted) {
      return extracted;
    }
  } catch {
    // ignore JSON parse errors
  }

  let deltaText = "";
  let completedText: string | null = null;
  for (const line of trimmed.split(/\r?\n/)) {
    const event = parseSSEDataLine(line);
    if (!event) {
      continue;
    }

    if (typeof event.delta === "string") {
      deltaText += event.delta;
    }

    if (event.type === "response.completed" && "response" in event) {
      const extracted = extractResponseText(event.response);
      if (extracted) {
        completedText = extracted;
      }
    }
  }

  if (deltaText.trim()) {
    return deltaText;
  }

  if (completedText?.trim()) {
    return completedText;
  }

  return null;
}

function extractResponseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const object = payload as Record<string, unknown>;

  if (typeof object.output_text === "string" && object.output_text.trim()) {
    return object.output_text.trim();
  }

  const output = object.output;
  if (!Array.isArray(output)) {
    return null;
  }

  const fragments: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }
      const contentRecord = contentItem as Record<string, unknown>;
      if (contentRecord.type !== "output_text") {
        continue;
      }
      const text = contentRecord.text;
      if (typeof text === "string" && text.trim()) {
        fragments.push(text.trim());
      }
    }
  }

  if (fragments.length === 0) {
    return null;
  }

  return fragments.join("\n");
}

async function parseCodexError(response: CodexHttpResponse): Promise<string> {
  const body = await readIncomingMessageText(response.stream);
  const parsedMessage = parseErrorBody(body);
  if (parsedMessage) {
    return `Request failed (${response.statusCode}): ${parsedMessage}`;
  }
  return `Request failed (${response.statusCode}): ${response.statusText || "Unknown error"}`;
}

function parseErrorBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string } | string;
      detail?: string;
    };

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }

    if (typeof parsed.error === "object" && parsed.error?.message?.trim()) {
      return parsed.error.message.trim();
    }

    if (parsed.detail?.trim()) {
      return parsed.detail.trim();
    }
  } catch {
    // ignore JSON parse error and fallback to plain text below
  }

  return trimmed;
}

async function readIncomingMessageText(response: IncomingMessage): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of response) {
    chunks.push(toUTF8(chunk));
  }

  return chunks.join("");
}

function toUTF8(chunk: Buffer | Uint8Array | string): string {
  if (typeof chunk === "string") {
    return chunk;
  }

  return Buffer.from(chunk).toString("utf8");
}
