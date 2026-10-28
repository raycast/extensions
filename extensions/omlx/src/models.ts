import { AI, getPreferenceValues } from "@raycast/api";
import {
  fetchModelsStatus,
  isServerRunning,
  formatBytes,
  formatModelName,
  isNonChatModelType,
  type OmlxModelStatus,
} from "./lib/omlx";
import { createSseParser } from "./sse-parser";

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
    .filter(
      (m) =>
        // Non-chat models (tokenizers, embeddings, rerankers) cannot serve
        // chat completions — keep them out of the Raycast AI picker.
        !m.is_helper &&
        !m.is_hidden &&
        !isNonChatModelType(m.config_model_type, m.id),
    )
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Prove that a plain schema accepts {} without implementing a full validator.
 * Property-local constraints are vacuous with no properties; required, bounds,
 * enum and const are checked explicitly. Compositions, references, negation,
 * conditionals and unknown keywords remain conservative rejections.
 */
export function acceptsEmptyObject(parameters: unknown): boolean {
  if (parameters == null) return true; // no schema declared: tool takes no input
  if (!isPlainObject(parameters)) return false;

  return Object.entries(parameters).every(([keyword, value]) => {
    switch (keyword) {
      case "type": {
        const types = Array.isArray(value) ? value : [value];
        return (
          types.includes("object") &&
          types.every((type) =>
            [
              "object",
              "null",
              "array",
              "string",
              "number",
              "integer",
              "boolean",
            ].includes(type),
          )
        );
      }
      case "required":
        return Array.isArray(value) && value.length === 0;
      case "minProperties":
        return value === 0;
      case "maxProperties":
        return (
          typeof value === "number" && Number.isInteger(value) && value >= 0
        );
      case "enum":
        return (
          Array.isArray(value) &&
          value.some(
            (entry) => isPlainObject(entry) && Object.keys(entry).length === 0,
          )
        );
      case "const":
        return isPlainObject(value) && Object.keys(value).length === 0;
      // These keywords only evaluate existing properties, so none can reject {}.
      case "properties":
      case "patternProperties":
      case "dependentRequired":
      case "dependentSchemas":
      case "dependencies":
      case "$defs":
      case "definitions":
        return isPlainObject(value);
      case "additionalProperties":
      case "unevaluatedProperties":
      case "propertyNames":
        return typeof value === "boolean" || isPlainObject(value);
      // Standard assertions for other instance types do not apply to objects.
      case "minimum":
      case "maximum":
      case "exclusiveMinimum":
      case "exclusiveMaximum":
      case "multipleOf":
      case "minLength":
      case "maxLength":
      case "pattern":
      case "format":
      case "contentEncoding":
      case "contentMediaType":
      case "contentSchema":
      case "items":
      case "additionalItems":
      case "prefixItems":
      case "contains":
      case "minContains":
      case "maxContains":
      case "minItems":
      case "maxItems":
      case "uniqueItems":
      case "unevaluatedItems":
        return true;
      // Annotations do not assert anything about the instance.
      case "$id":
      case "id":
      case "$anchor":
      case "$comment":
      case "title":
      case "description":
      case "default":
      case "examples":
      case "deprecated":
      case "readOnly":
      case "writeOnly":
        return true;
      case "$schema":
        return (
          typeof value === "string" &&
          [
            "http://json-schema.org/draft-04/schema#",
            "http://json-schema.org/draft-06/schema#",
            "http://json-schema.org/draft-07/schema#",
            "https://json-schema.org/draft/2019-09/schema",
            "https://json-schema.org/draft/2020-12/schema",
          ].includes(value)
        );
      default:
        return false;
    }
  });
}

function convertMessages(
  messages: NonNullable<Parameters<AI.StreamCompletion>[1]["messages"]>,
): unknown[] {
  return messages
    .map((msg) => {
      if (msg.role === "user" && Array.isArray(msg.content)) {
        const parts = msg.content.map((part: Record<string, unknown>) => {
          if (part.type === "file" && part.data && part.mediaType) {
            let base64: string;
            if (typeof part.data === "string") {
              base64 = part.data;
            } else if (
              part.data instanceof Uint8Array ||
              part.data instanceof ArrayBuffer
            ) {
              const bytes =
                part.data instanceof ArrayBuffer
                  ? new Uint8Array(part.data)
                  : part.data;
              base64 = Buffer.from(bytes).toString("base64");
            } else {
              return part;
            }
            return {
              type: "image_url",
              image_url: { url: `data:${part.mediaType};base64,${base64}` },
            };
          }
          return part;
        });
        return { ...msg, content: parts };
      }

      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        const textParts = msg.content
          .filter(
            (p: Record<string, unknown>) =>
              p.type === "text" || p.type === "reasoning",
          )
          .map((p: Record<string, unknown>) => p.text ?? "")
          .join("");
        const toolCalls = msg.content
          .filter((p: Record<string, unknown>) => p.type === "tool-call")
          .map((p: Record<string, unknown>, i: number) => ({
            id: p.toolCallId,
            type: "function",
            index: i,
            function: {
              name: p.toolName,
              arguments: JSON.stringify(p.input ?? {}),
            },
          }));
        return {
          role: "assistant",
          content: textParts || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        };
      }

      if (msg.role === "tool" && Array.isArray(msg.content)) {
        return msg.content.map((part: Record<string, unknown>) => ({
          role: "tool",
          tool_call_id: part.toolCallId,
          content: JSON.stringify(
            (part.output as Record<string, unknown>)?.value ??
              part.output ??
              "",
          ),
        }));
      }

      return msg;
    })
    .flat();
}

export const streamCompletion: AI.StreamCompletion = async function* (
  model,
  request,
) {
  const { serverUrl, apiKey } = getPreferenceValues<ExtensionPreferences>();

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      ...(request.system
        ? [{ role: "system" as const, content: request.system }]
        : []),
      ...convertMessages(request.messages ?? []),
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
    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }
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

  // Empty tool arguments are only valid for tools whose schema accepts an
  // empty object; unknown tools are rejected conservatively. web_search is
  // provider-executed (injected below/intercepted) and requires a query.
  const acceptsEmpty = new Map<string, boolean>();
  for (const tool of openaiTools ?? []) {
    acceptsEmpty.set(
      tool.function.name,
      acceptsEmptyObject(tool.function.parameters),
    );
  }
  acceptsEmpty.set("web_search", false);
  const parser = createSseParser({
    acceptsEmptyInput: (name) => acceptsEmpty.get(name) ?? false,
  });

  for await (const chunk of nodeStream) {
    for (const part of parser.feed(chunk as Uint8Array | string)) {
      yield part;
    }
    if (parser.isDone()) break;
  }

  // Normal end-of-stream: consume a trailing data event that arrived
  // without a newline and emit tool calls that never got a terminal
  // marker (finish_reason / [DONE]).
  for (const part of parser.flush()) {
    yield part;
  }
};
