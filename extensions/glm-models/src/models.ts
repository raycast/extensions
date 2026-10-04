import { AI } from "@raycast/api";
import {
  createOpenAICompatible,
  type OpenAICompatibleProvider,
} from "@ai-sdk/openai-compatible";
import {
  streamText,
  jsonSchema,
  type ModelMessage,
  type TextPart,
  type ImagePart,
  type ToolCallPart,
  type ToolResultPart,
} from "ai";
import { getModels, getPreferences, isGlm5 } from "./lib/catalog";
import { log } from "./lib/log";

export { getModels };

const providerCache = new Map<
  string,
  OpenAICompatibleProvider<string, string, string, string>
>();

function getProvider(): OpenAICompatibleProvider<
  string,
  string,
  string,
  string
> {
  const { apiKey, baseURL } = getPreferences();
  if (!apiKey || !baseURL) {
    // Fail fast with an actionable message instead of an opaque fetch error
    // from a half-configured provider (e.g. Custom without a base URL).
    throw new Error(
      "GLM Models is not configured: set your API key (and, for the Custom platform, an HTTPS base URL) in the extension preferences, then run Check Setup.",
    );
  }
  const cacheKey = `${baseURL}|${apiKey}`;
  let provider = providerCache.get(cacheKey);
  if (!provider) {
    provider = createOpenAICompatible({ name: "zai", baseURL, apiKey });
    providerCache.set(cacheKey, provider);
  }
  return provider;
}

function toBytes(
  data: string | Uint8Array | ArrayBuffer | URL,
): Uint8Array | null {
  if (typeof data === "string") {
    // Raycast delivers base64 strings; tolerate data-URL prefixes and drop
    // attachments that don't decode instead of failing the whole turn.
    try {
      const binary = atob(data.replace(/^data:[^;]*;base64,/i, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      log("image attachment is not valid base64 — dropping it");
      return null;
    }
  }
  if (data instanceof URL) {
    log(
      "image attachment delivered as URL, which cannot be inlined — dropping it",
    );
    return null;
  }
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function convertMessages(
  messages: readonly AI.ModelMessage[] | undefined,
): ModelMessage[] {
  const converted: ModelMessage[] = [];
  for (const message of messages ?? []) {
    switch (message.role) {
      case "system":
        converted.push({ role: "system", content: message.content });
        break;
      case "user": {
        const parts: Array<TextPart | ImagePart> = [];
        for (const part of message.content) {
          if (part.type === "text") {
            parts.push(part);
          } else if (part.mediaType.startsWith("image/")) {
            const bytes = toBytes(part.data);
            if (bytes) {
              // Raw bytes, not a data URL: URL-shaped strings make the AI SDK
              // "download" them, which needs the `undici` package that is not
              // available in Raycast's runtime.
              parts.push({
                type: "image",
                image: bytes,
                mediaType: part.mediaType,
              });
            }
          }
          // Attachments in formats GLM can't ingest are dropped.
        }
        // An empty content array is rejected by the API — a turn whose parts
        // were all dropped is omitted entirely.
        if (parts.length > 0) {
          converted.push({ role: "user", content: parts });
        }
        break;
      }
      case "assistant": {
        const parts: Array<TextPart | ToolCallPart> = [];
        for (const part of message.content) {
          if (part.type === "text") {
            parts.push(part);
          } else if (part.type === "tool-call") {
            parts.push({
              type: "tool-call",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input,
            });
          }
          // Prior-turn reasoning is not replayed: Z.ai clears it from context by default.
        }
        // As above: skip turns left with no content (reasoning-only turns).
        if (parts.length > 0) {
          converted.push({ role: "assistant", content: parts });
        }
        break;
      }
      case "tool": {
        // Cast needed: Raycast and the AI SDK declare structurally identical JSONValue types.
        const parts = message.content.map((result): ToolResultPart => ({
          type: "tool-result",
          toolCallId: result.toolCallId,
          toolName: result.toolName,
          output: {
            type: "json",
            value: result.output.value,
          } as ToolResultPart["output"],
        }));
        converted.push({ role: "tool", content: parts });
        break;
      }
    }
  }
  return converted;
}

function buildProviderOptions(
  modelId: string,
  request: AI.ModelRequest,
): {
  thinking?: { type: "enabled" | "disabled" };
  reasoning_effort?: string;
} {
  const effort = request.providerOptions?.raycast?.reasoningEffort;
  if (!effort) return {};
  if (isGlm5(modelId)) {
    // GLM-5.x: thinking stays on, depth follows reasoning_effort. "none" is
    // only the picker's off-sentinel — never send it as an API effort value.
    if (effort === "none") return { thinking: { type: "disabled" } };
    return {
      thinking: { type: "enabled" },
      reasoning_effort: effort,
    };
  }
  // GLM-4.x: only enable/disable is supported; Raycast's effort picker maps "none" to disabled.
  return { thinking: { type: effort === "none" ? "disabled" : "enabled" } };
}

export const streamCompletion: AI.StreamCompletion = (model, request) => {
  const provider = getProvider();
  const toolEntries = request.tools
    ? Object.fromEntries(
        Object.entries(request.tools).map(([name, tool]) => [
          name,
          {
            description: tool.description,
            inputSchema: jsonSchema<Record<string, unknown>>(
              (tool.inputSchema ?? {}) as Parameters<typeof jsonSchema>[0],
            ),
          },
        ]),
      )
    : undefined;
  const tools = toolEntries as unknown as NonNullable<
    Parameters<typeof streamText>[0]
  >["tools"];

  const result = streamText({
    model: provider.chatModel(model.id),
    system: request.system,
    messages: convertMessages(request.messages),
    temperature:
      request.temperature != null
        ? Math.min(Math.max(request.temperature, 0), 1)
        : undefined,
    tools,
    toolChoice: request.toolChoice,
    providerOptions: { zai: buildProviderOptions(model.id, request) },
  });

  // Raycast modeled ModelStreamPart on the Vercel AI SDK's stream parts: the unions are
  // structurally compatible but live in different packages, so the type system can't verify
  // this boundary. If streaming ever breaks after an SDK upgrade, this cast is the seam to check.
  return {
    fullStream:
      result.fullStream as unknown as AsyncIterable<AI.ModelStreamPart>,
  };
};
