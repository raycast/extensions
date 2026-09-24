import { AI, getPreferenceValues } from "@raycast/api";
import {
  fetchModelsStatus,
  isServerRunning,
  formatBytes,
  formatModelName,
  type OmlxModelStatus,
} from "./lib/omlx";

interface Preferences {
  serverUrl: string;
  apiKey: string;
}

function buildDescription(model: OmlxModelStatus): string {
  const parts: string[] = [];
  if (model.model_type === "vlm") parts.push("Vision");
  if (model.loaded) parts.push("Loaded");
  if (model.pinned) parts.push("Pinned");
  if (model.thinking_default) parts.push("Thinking");
  parts.push(formatBytes(model.estimated_size));
  return parts.join(" · ");
}

export const getModels: AI.GetModels = async () => {
  const running = await isServerRunning();
  if (!running) return [];

  const models = await fetchModelsStatus();

  return models
    .filter((m) => !m.is_helper && !m.is_hidden)
    .map((model) => ({
      id: model.id,
      title: formatModelName(model.id),
      description: buildDescription(model),
      isLocal: true,
      sizeInBytes: model.estimated_size,
      contextWindow: model.max_context_window,
      capabilities: {
        // Per-model: vision detected from oMLX model_type
        ...(model.model_type === "vlm"
          ? {
              vision: {
                mediaTypes: [
                  "image/png" as const,
                  "image/jpeg" as const,
                  "image/webp" as const,
                  "image/gif" as const,
                ],
              },
            }
          : {}),
        // Per-model: reasoning effort for thinking-capable models
        ...(model.thinking_default
          ? {
              reasoningEffort: {
                supported: true,
                options: ["low", "medium", "high"],
                default: "high",
              },
            }
          : {}),
        // Server-wide: oMLX supports these for all models
        systemMessage: { supported: true },
        temperature: { supported: true },
        streaming: { supported: true },
        tools: { supported: true },
      },
    }));
};

function convertTools(
  tools:
    | Record<
        string,
        { type?: string; description?: string; inputSchema?: unknown }
      >
    | undefined,
) {
  if (!tools) return undefined;
  return Object.entries(tools).map(([name, tool]) => ({
    type: "function" as const,
    function: {
      name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

export const streamCompletion: AI.StreamCompletion = async function* (
  model,
  request,
) {
  const { serverUrl, apiKey } = getPreferenceValues<Preferences>();

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      ...(request.system
        ? [{ role: "system" as const, content: request.system }]
        : []),
      ...(request.messages ?? []),
    ],
    stream: true,
  };

  if (request.temperature != null) {
    body.temperature = request.temperature;
  }

  const reasoningEffort = request.providerOptions?.raycast?.reasoningEffort;
  if (typeof reasoningEffort === "string") {
    body.reasoning_effort = reasoningEffort;
  }

  const openaiTools = convertTools(request.tools);
  if (openaiTools?.length) {
    body.tools = openaiTools;
  }

  const response = await fetch(`${serverUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`oMLX ${response.status}: ${errorText.slice(0, 200)}`);
  }

  if (!response.body) {
    throw new Error("No response body from oMLX");
  }

  const { Readable } = await import("stream");
  const nodeStream = Readable.fromWeb(
    response.body as import("stream/web").ReadableStream,
  );

  let buffer = "";
  const toolCalls = new Map<number, ToolCallAccumulator>();

  for await (const chunk of nodeStream) {
    buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        for (const tc of toolCalls.values()) {
          let input: unknown = {};
          try {
            input = JSON.parse(tc.arguments);
          } catch {
            /* use empty */
          }
          yield {
            type: "tool-call" as const,
            toolCallId: tc.id,
            toolName: tc.name,
            input,
          };
        }
        return;
      }

      try {
        const parsed = JSON.parse(data);
        if (parsed.model === "keepalive") continue;
        const delta = parsed.choices?.[0]?.delta;
        const finishReason = parsed.choices?.[0]?.finish_reason;

        if (delta?.reasoning_content) {
          yield {
            type: "reasoning-delta" as const,
            textDelta: delta.reasoning_content,
          };
        }
        if (delta?.content) {
          yield { type: "text-delta" as const, textDelta: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (tc.id) {
              toolCalls.set(idx, {
                id: tc.id,
                name: tc.function?.name ?? "",
                arguments: tc.function?.arguments ?? "",
              });
            } else {
              const existing = toolCalls.get(idx);
              if (existing && tc.function?.arguments) {
                existing.arguments += tc.function.arguments;
              }
            }
          }
        }

        if (finishReason === "tool_calls") {
          for (const tc of toolCalls.values()) {
            let input: unknown = {};
            try {
              input = JSON.parse(tc.arguments);
            } catch {
              /* use empty */
            }
            yield {
              type: "tool-call" as const,
              toolCallId: tc.id,
              toolName: tc.name,
              input,
            };
          }
          toolCalls.clear();
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
};
