import { OpenAIHttpError, OpenAIResponseError } from "./errors";

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

function buildChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function extractContentText(content: unknown): string | null {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed ? trimmed : null;
  }

  if (content && typeof content === "object") {
    const objectContent = content as Record<string, unknown>;
    const preferredKeys = [
      "text",
      "content",
      "value",
      "parts",
      "output_text",
      "outputText",
      "response",
      "result",
      "message",
      "translation",
    ];
    for (const key of preferredKeys) {
      if (key in objectContent) {
        const extracted = extractContentText(objectContent[key]);
        if (extracted) {
          return extracted;
        }
      }
    }

    const ignoredKeys = new Set([
      "type",
      "role",
      "id",
      "index",
      "object",
      "created",
      "model",
      "finish_reason",
      "native_finish_reason",
    ]);
    for (const [key, value] of Object.entries(objectContent)) {
      if (ignoredKeys.has(key)) {
        continue;
      }

      const extracted = extractContentText(value);
      if (extracted) {
        return extracted;
      }
    }
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();

    return text ? text : null;
  }

  return null;
}

function extractResponseText(data: any): string | null {
  const messageContent = extractContentText(data?.choices?.[0]?.message?.content);
  if (messageContent) {
    return messageContent;
  }

  const messageText = extractContentText(data?.choices?.[0]?.message);
  if (messageText) {
    return messageText;
  }

  const choiceText = extractContentText(data?.choices?.[0]?.text);
  if (choiceText) {
    return choiceText;
  }

  const outputText = extractContentText(data?.output_text);
  if (outputText) {
    return outputText;
  }

  const outputContent = data?.output?.flatMap?.((item: any) => item?.content ?? []) ?? null;
  if (outputContent) {
    return extractContentText(outputContent);
  }

  return null;
}

function summarizeResponse(data: any) {
  const topLevelKeys = data && typeof data === "object" ? Object.keys(data).slice(0, 8).join(", ") : typeof data;
  const choiceKeys =
    data?.choices?.[0] && typeof data.choices[0] === "object"
      ? Object.keys(data.choices[0]).slice(0, 8).join(", ")
      : "none";
  const messageKeys =
    data?.choices?.[0]?.message && typeof data.choices[0].message === "object"
      ? Object.keys(data.choices[0].message).slice(0, 8).join(", ")
      : "none";
  const contentKeys =
    data?.choices?.[0]?.message?.content && typeof data.choices[0].message.content === "object"
      ? Object.keys(data.choices[0].message.content).slice(0, 8).join(", ")
      : "none";
  const contentType = Array.isArray(data?.choices?.[0]?.message?.content)
    ? "array"
    : typeof data?.choices?.[0]?.message?.content;

  return `顶层键: ${topLevelKeys}; choices[0] 键: ${choiceKeys}; message 键: ${messageKeys}; message.content 类型: ${contentType}; message.content 键: ${contentKeys}`;
}

function stringifyResponse(data: unknown) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function getProviderErrorMessage(data: any): string | null {
  return typeof data?.error === "string"
    ? data.error
    : typeof data?.error?.message === "string"
      ? data.error.message
      : null;
}

function buildRequestBody(input: {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}) {
  return JSON.stringify({
    model: input.model,
    messages: input.messages,
    ...(input.stream ? { stream: true } : {}),
  });
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractStreamDeltaText(data: any): string | null {
  const chatDelta = extractContentText(data?.choices?.[0]?.delta?.content);
  if (chatDelta) {
    return chatDelta;
  }

  const responsesDelta = extractContentText(data?.delta);
  if (data?.type === "response.output_text.delta" && responsesDelta) {
    return responsesDelta;
  }

  return null;
}

function extractStreamDoneText(data: any): string | null {
  if (data?.type === "response.output_text.done") {
    return extractContentText(data?.text);
  }

  return null;
}

function parseSseEventBlock(block: string) {
  const lines = block.split(/\r?\n/);
  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart());

  if (!dataLines.length) {
    return null;
  }

  return dataLines.join("\n");
}

async function extractTextFromSseStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedText = "";
  let completedText: string | null = null;

  const handleEventPayload = (payload: string) => {
    if (!payload || payload === "[DONE]") {
      return;
    }

    let data: any;
    try {
      data = JSON.parse(payload);
    } catch {
      return;
    }

    const providerErrorMessage = getProviderErrorMessage(data);
    if (providerErrorMessage) {
      throw new OpenAIResponseError(
        `${providerErrorMessage}

\`\`\`json
${stringifyResponse(data)}
\`\`\``,
      );
    }

    const deltaText = extractStreamDeltaText(data);
    if (deltaText) {
      streamedText += deltaText;
      return;
    }

    if (!streamedText) {
      const doneText = extractStreamDoneText(data);
      if (doneText) {
        completedText = doneText;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const eventBlocks = buffer.split(/\r?\n\r?\n/);
    buffer = eventBlocks.pop() ?? "";

    for (const block of eventBlocks) {
      const payload = parseSseEventBlock(block);
      if (payload) {
        handleEventPayload(payload);
      }
    }

    if (done) {
      break;
    }
  }

  const tailPayload = parseSseEventBlock(buffer);
  if (tailPayload) {
    handleEventPayload(tailPayload);
  }

  const trimmedStreamedText = streamedText.trim();
  if (trimmedStreamedText) {
    return trimmedStreamedText;
  }

  const completedTextValue = completedText as string | null;
  const trimmedCompletedText = completedTextValue?.trim() ?? null;
  return trimmedCompletedText ? trimmedCompletedText : null;
}

async function requestStreamingChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const response = await fetch(buildChatCompletionsUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: buildRequestBody({
      model: input.model,
      messages: input.messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await readJsonSafely(response);
    throw new OpenAIHttpError(response.status, getProviderErrorMessage(data) ?? undefined);
  }

  if (!response.body) {
    return null;
  }

  return extractTextFromSseStream(response.body);
}

export async function requestChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}): Promise<string> {
  const response = await fetch(buildChatCompletionsUrl(input.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: buildRequestBody({
      model: input.model,
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    const data = await readJsonSafely(response);
    throw new OpenAIHttpError(response.status, getProviderErrorMessage(data) ?? undefined);
  }

  const data = await response.json();
  const providerErrorMessage = getProviderErrorMessage(data);
  if (providerErrorMessage) {
    throw new OpenAIResponseError(
      `${providerErrorMessage}

\`\`\`json
${stringifyResponse(data)}
\`\`\``,
    );
  }

  const content = extractResponseText(data);
  if (content) {
    return content;
  }

  const streamContent = await requestStreamingChatCompletion(input);
  if (streamContent) {
    return streamContent;
  }

  throw new OpenAIResponseError(
    `OpenAI 响应为空，未提供可显示的译文。已尝试非流式响应和 SSE 流式回退，但都没有拿到正文。${summarizeResponse(data)}

\`\`\`json
${stringifyResponse(data)}
\`\`\``,
  );
}
