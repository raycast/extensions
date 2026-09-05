import { Message } from "../type";
import { CodexAppServerClient, withCodexAppServer } from "./codex-app-server";

interface CodexResponseParams {
  model: string;
  messages: Message[];
  instructions?: string;
  stream: boolean;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
  threadId?: string | null;
}

interface CodexResponseResult {
  text: string;
  threadId: string;
}

interface ThreadStartResponse {
  thread: {
    id: string;
  };
}

interface ThreadResumeResponse {
  thread: {
    id: string;
  };
}

interface TurnStartResponse {
  turn: {
    id: string;
  };
}

interface AgentMessageDeltaNotification {
  threadId: string;
  turnId: string;
  itemId: string;
  delta: string;
}

interface TurnCompletedNotification {
  threadId: string;
  turn: {
    id: string;
    status: "completed" | "interrupted" | "failed" | "inProgress";
    error?: {
      message?: string;
      additionalDetails?: string | null;
    } | null;
  };
}

interface ItemCompletedNotification {
  threadId: string;
  turnId: string;
  item: {
    type?: string;
    text?: string;
  };
}

type ResponsesHistoryItem = {
  type: "message";
  role: "user" | "assistant";
  content: Array<
    | {
        type: "input_text";
        text: string;
      }
    | {
        type: "input_image";
        image_url: string;
      }
    | {
        type: "output_text";
        text: string;
      }
  >;
};

type TurnInputItem =
  | {
      type: "text";
      text: string;
      text_elements: [];
    }
  | {
      type: "image";
      url: string;
    };

export async function requestCodexResponse(params: CodexResponseParams): Promise<CodexResponseResult> {
  const instructions = resolveInstructions(params.instructions, params.messages);
  const { historyItems, turnInput } = splitMessagesForTurn(params.messages);
  const model = params.model.trim() || "gpt-5.4-mini";

  if (turnInput.length === 0) {
    throw new Error("No user input was available for the ChatGPT request.");
  }

  return withCodexAppServer(async (client) => {
    return runCodexTurn({
      client,
      model,
      instructions,
      historyItems,
      turnInput,
      stream: params.stream,
      signal: params.signal,
      onDelta: params.onDelta,
      threadId: params.threadId,
    });
  });
}

async function runCodexTurn(options: {
  client: CodexAppServerClient;
  model: string;
  instructions: string;
  historyItems: ResponsesHistoryItem[];
  turnInput: TurnInputItem[];
  stream: boolean;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
  threadId?: string | null;
}): Promise<CodexResponseResult> {
  let threadId = options.threadId ?? null;

  try {
    if (!threadId) {
      threadId = await startCodexThread(options.client, options.model, options.instructions, options.historyItems);
    } else {
      threadId = await resumeCodexThread(options.client, threadId, options.model);
    }

    const turn = await options.client.request<TurnStartResponse>("turn/start", {
      threadId,
      input: options.turnInput,
      model: options.model,
      ...(supportsReasoningEffort(options.model) ? { effort: "medium" } : {}),
    });

    const text = await waitForTurnCompletion({
      client: options.client,
      threadId,
      turnId: turn.turn.id,
      stream: options.stream,
      signal: options.signal,
      onDelta: options.onDelta,
    });

    return { text, threadId };
  } catch (error) {
    if (!threadId || !shouldRetryWithFreshThread(error)) {
      throw error;
    }

    const freshThreadId = await startCodexThread(
      options.client,
      options.model,
      options.instructions,
      options.historyItems,
    );
    const turn = await options.client.request<TurnStartResponse>("turn/start", {
      threadId: freshThreadId,
      input: options.turnInput,
      model: options.model,
      ...(supportsReasoningEffort(options.model) ? { effort: "medium" } : {}),
    });

    const text = await waitForTurnCompletion({
      client: options.client,
      threadId: freshThreadId,
      turnId: turn.turn.id,
      stream: options.stream,
      signal: options.signal,
      onDelta: options.onDelta,
    });

    return { text, threadId: freshThreadId };
  }
}

async function startCodexThread(
  client: CodexAppServerClient,
  model: string,
  instructions: string,
  historyItems: ResponsesHistoryItem[],
): Promise<string> {
  const thread = await client.request<ThreadStartResponse>("thread/start", {
    model,
    approvalPolicy: "never",
    sandbox: "read-only",
    developerInstructions: instructions,
    serviceName: "raycast_chatgpt_extension",
    ephemeral: false,
    experimentalRawEvents: false,
    persistExtendedHistory: false,
  });

  const threadId = thread.thread.id;
  if (historyItems.length > 0) {
    await client.request("thread/inject_items", {
      threadId,
      items: historyItems,
    });
  }

  return threadId;
}

async function resumeCodexThread(client: CodexAppServerClient, threadId: string, model: string): Promise<string> {
  const response = await client.request<ThreadResumeResponse>("thread/resume", {
    threadId,
    model,
  });

  return response.thread.id;
}

function shouldRetryWithFreshThread(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    (message.includes("thread") || message.includes("rollout")) &&
    (message.includes("not loaded") ||
      message.includes("not found") ||
      message.includes("unknown") ||
      message.includes("closed") ||
      message.includes("unavailable") ||
      message.includes("no rollout found"))
  );
}

async function waitForTurnCompletion(options: {
  client: CodexAppServerClient;
  threadId: string;
  turnId: string;
  stream: boolean;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}): Promise<string> {
  let answer = "";
  let finalAgentMessage: string | null = null;

  const removeDeltaListener = options.client.onNotification("item/agentMessage/delta", (raw) => {
    const params = raw as AgentMessageDeltaNotification;
    if (params.threadId !== options.threadId || params.turnId !== options.turnId || !params.delta) {
      return;
    }

    answer += params.delta;
    if (options.stream) {
      options.onDelta?.(params.delta);
    }
  });

  const removeItemCompletedListener = options.client.onNotification("item/completed", (raw) => {
    const params = raw as ItemCompletedNotification;
    if (params.threadId !== options.threadId || params.turnId !== options.turnId) {
      return;
    }

    if (params.item.type === "agentMessage" && typeof params.item.text === "string") {
      finalAgentMessage = params.item.text;
    }
  });

  const onAbort = async () => {
    try {
      await options.client.request("turn/interrupt", {
        threadId: options.threadId,
        turnId: options.turnId,
      });
    } catch {
      // The process is about to close anyway.
    }
  };

  if (options.signal?.aborted) {
    await onAbort();
    throw createAbortError();
  }

  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const completed = await options.client.waitForNotification<TurnCompletedNotification>(
      "turn/completed",
      (params) => params.threadId === options.threadId && params.turn.id === options.turnId,
      options.signal,
    );

    if (completed.turn.status === "failed") {
      throw new Error(formatTurnError(completed.turn.error));
    }

    if (completed.turn.status === "interrupted") {
      throw createAbortError();
    }

    const responseText = finalAgentMessage || answer;
    return responseText.trim();
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError();
    }
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    removeDeltaListener();
    removeItemCompletedListener();
  }
}

function formatTurnError(error: TurnCompletedNotification["turn"]["error"] | undefined): string {
  if (!error) {
    return "ChatGPT request failed in Codex app-server.";
  }

  const message = error.message?.trim() || "ChatGPT request failed in Codex app-server.";
  const details = error.additionalDetails?.trim();
  return details ? `${message} ${details}` : message;
}

function supportsReasoningEffort(model: string): boolean {
  return model.startsWith("gpt-5");
}

function splitMessagesForTurn(messages: Message[]): {
  historyItems: ResponsesHistoryItem[];
  turnInput: TurnInputItem[];
} {
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) {
    return { historyItems: [], turnInput: [] };
  }

  const historyItems = messages.slice(0, lastUserIndex).flatMap((message) => {
    const item = mapMessageToHistoryItem(message);
    return item ? [item] : [];
  });

  return {
    historyItems,
    turnInput: mapMessageToTurnInput(messages[lastUserIndex]),
  };
}

function findLastUserMessageIndex(messages: Message[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return index;
    }
  }

  return -1;
}

function mapMessageToHistoryItem(message: Message): ResponsesHistoryItem | null {
  if (message.role !== "user" && message.role !== "assistant") {
    return null;
  }

  const content = mapHistoryContent(message.role, message.content);
  if (content.length === 0) {
    return null;
  }

  return {
    type: "message",
    role: message.role,
    content,
  };
}

function mapHistoryContent(role: "user" | "assistant", content: Message["content"]): ResponsesHistoryItem["content"] {
  if (typeof content === "string") {
    const text = content.trim();
    if (!text) {
      return [];
    }

    return role === "assistant" ? [{ type: "output_text", text }] : [{ type: "input_text", text }];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  const result: ResponsesHistoryItem["content"] = [];
  for (const part of content) {
    if (!part || typeof part !== "object" || !("type" in part) || typeof part.type !== "string") {
      continue;
    }

    if (part.type === "text" && "text" in part && typeof part.text === "string" && part.text.trim()) {
      result.push(
        role === "assistant" ? { type: "output_text", text: part.text } : { type: "input_text", text: part.text },
      );
      continue;
    }

    if (role === "user" && part.type === "image_url" && "image_url" in part) {
      const imageUrl = resolveImageUrl(part.image_url);
      if (imageUrl.trim()) {
        result.push({ type: "input_image", image_url: imageUrl });
      }
    }
  }

  return result;
}

function mapMessageToTurnInput(message: Message): TurnInputItem[] {
  if (message.role !== "user") {
    return [];
  }

  const content = message.content;
  if (typeof content === "string") {
    const text = content.trim();
    return text ? [{ type: "text", text, text_elements: [] }] : [];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  const result: TurnInputItem[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object" || !("type" in part) || typeof part.type !== "string") {
      continue;
    }

    if (part.type === "text" && "text" in part && typeof part.text === "string" && part.text.trim()) {
      result.push({ type: "text", text: part.text, text_elements: [] });
      continue;
    }

    if (part.type === "image_url" && "image_url" in part) {
      const imageUrl = resolveImageUrl(part.image_url);
      if (imageUrl.trim()) {
        result.push({ type: "image", url: imageUrl });
      }
    }
  }

  return result;
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

function resolveImageUrl(imageUrl: unknown): string {
  if (typeof imageUrl === "string") {
    return imageUrl;
  }

  if (
    imageUrl &&
    typeof imageUrl === "object" &&
    "url" in imageUrl &&
    typeof (imageUrl as { url?: unknown }).url === "string"
  ) {
    return (imageUrl as { url: string }).url;
  }

  return "";
}

function createAbortError(): Error {
  const error = new Error("AbortError");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message === "AbortError");
}
