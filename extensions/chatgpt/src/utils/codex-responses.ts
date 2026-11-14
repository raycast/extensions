import { Message, ReasoningEffort } from "../type";
import { CodexAppServerClient, withCodexAppServer } from "./codex-app-server";
import { DEFAULT_MODEL_OPTION, isModelId } from "./model-support";
import { localImageTurnInput } from "./local-image";

interface CodexResponseParams {
  model: string;
  effort?: ReasoningEffort;
  supportedEfforts?: string[];
  messages: Message[];
  imagePaths?: string[];
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
    }
  | {
      type: "localImage";
      path: string;
    };

export async function requestCodexResponse(params: CodexResponseParams): Promise<CodexResponseResult> {
  const instructions = resolveInstructions(params.instructions, params.messages);
  const { historyItems, turnInput } = splitMessagesForTurn(params.messages);
  const model = params.model.trim() || DEFAULT_MODEL_OPTION;
  if (!isModelId(model)) throw new Error(`Invalid model: ${model}`);
  for (const imagePath of params.imagePaths ?? []) {
    turnInput.push(await localImageTurnInput(imagePath));
  }

  if (turnInput.length === 0) {
    throw new Error("No user input was available for the ChatGPT request.");
  }

  return withCodexAppServer(async (client) => {
    return runCodexTurn({
      client,
      model,
      effort: params.supportedEfforts?.includes(params.effort ?? "") ? params.effort : undefined,
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
  effort?: ReasoningEffort;
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

    const text = await waitForTurnCompletion({
      client: options.client,
      threadId,
      model: options.model,
      effort: options.effort,
      input: options.turnInput,
      stream: options.stream,
      signal: options.signal,
      onDelta: options.onDelta,
    });

    return { text, threadId };
  } catch (error) {
    if (
      options.signal?.aborted ||
      isAbortError(error) ||
      !options.threadId ||
      !threadId ||
      !shouldRetryWithFreshThread(error)
    ) {
      throw error;
    }

    const freshThreadId = await startCodexThread(
      options.client,
      options.model,
      options.instructions,
      options.historyItems,
    );
    const text = await waitForTurnCompletion({
      client: options.client,
      threadId: freshThreadId,
      model: options.model,
      effort: options.effort,
      input: options.turnInput,
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
  if (!(error instanceof Error) || !("code" in error)) return false;
  const code = (error as Error & { code?: number }).code;
  const data = (error as Error & { data?: unknown }).data;
  return (
    code === -32602 &&
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    (data.code === "thread_not_found" || data.code === "rollout_not_found")
  );
}

async function waitForTurnCompletion(options: {
  client: CodexAppServerClient;
  threadId: string;
  model: string;
  effort?: ReasoningEffort;
  input: TurnInputItem[];
  stream: boolean;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}): Promise<string> {
  let answer = "";
  let finalAgentMessage: string | null = null;
  let turnId: string | null = null;
  const completionAbort = new AbortController();
  const earlyDeltas: AgentMessageDeltaNotification[] = [];
  const earlyItems: ItemCompletedNotification[] = [];
  const earlyCompletions: TurnCompletedNotification[] = [];

  const appendDelta = (params: AgentMessageDeltaNotification) => {
    if (params.threadId !== options.threadId || params.turnId !== turnId || !params.delta) return;
    answer += params.delta;
    if (options.stream) options.onDelta?.(params.delta);
  };
  const removeDeltaListener = options.client.onNotification("item/agentMessage/delta", (raw) => {
    const params = raw as AgentMessageDeltaNotification;
    if (turnId === null) earlyDeltas.push(params);
    else appendDelta(params);
  });

  const captureItem = (params: ItemCompletedNotification) => {
    if (params.threadId !== options.threadId || params.turnId !== turnId) return;
    if (params.item.type === "agentMessage" && typeof params.item.text === "string") {
      finalAgentMessage = params.item.text;
    }
  };
  const removeItemCompletedListener = options.client.onNotification("item/completed", (raw) => {
    const params = raw as ItemCompletedNotification;
    if (turnId === null) earlyItems.push(params);
    else captureItem(params);
  });

  const onAbort = async () => {
    try {
      if (turnId) await options.client.request("turn/interrupt", { threadId: options.threadId, turnId });
    } catch {
      // The process is about to close anyway.
    }
  };

  try {
    if (options.signal?.aborted) throw createAbortError();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    // Subscribe before turn/start: a fast turn can finish before its request resolves.
    const completion = options.client.waitForNotification<TurnCompletedNotification>(
      "turn/completed",
      (params) => {
        if (params.threadId !== options.threadId) return false;
        if (turnId === null) {
          earlyCompletions.push(params);
          return false;
        }
        return params.turn.id === turnId;
      },
      options.signal ? AbortSignal.any([options.signal, completionAbort.signal]) : completionAbort.signal,
    );
    void completion.catch(() => undefined);
    let turn: TurnStartResponse;
    try {
      turn = await options.client.request<TurnStartResponse>("turn/start", {
        threadId: options.threadId,
        input: options.input,
        model: options.model,
        ...(options.effort ? { effort: options.effort } : {}),
      });
    } catch (error) {
      completionAbort.abort();
      await completion.catch(() => undefined);
      throw error;
    }
    turnId = turn.turn.id;
    earlyDeltas.forEach(appendDelta);
    earlyItems.forEach(captureItem);
    if (options.signal?.aborted) await onAbort();
    const earlyCompletion = earlyCompletions.find((event) => event.turn.id === turnId);
    if (earlyCompletion) completionAbort.abort();
    const completed = earlyCompletion ?? (await completion);

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
    completionAbort.abort();
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
