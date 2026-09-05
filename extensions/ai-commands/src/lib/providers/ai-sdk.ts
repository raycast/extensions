import { dynamicTool, jsonSchema, ModelMessage, ToolSet } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { MessageRole, ToolCall } from "../inference/types";
import { getProviderApiKey } from "./model-sync";
import { CustomModel, CustomProvider, UnifiedChatMessage } from "./types";

export enum AiSdkContentType {
  TEXT = "text",
  IMAGE = "image",
  TOOL_CALL = "tool-call",
  TOOL_RESULT = "tool-result",
}

export enum AiSdkToolType {
  FUNCTION = "function",
}

export enum ReasoningEffort {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  MAX = "max",
}

export function createLanguageModel(provider: CustomProvider, model?: CustomModel) {
  const apiKey = getProviderApiKey(provider, model?.provider);
  const client = createOpenAICompatible({
    name: provider.id,
    baseURL: provider.base_url.trim().replace(/\/+$/, ""),
    ...(apiKey && { apiKey }),
    headers: provider.headers,
    includeUsage: true,
  });
  return (modelId: string) => client(modelId);
}

export function toModelMessages(messages: UnifiedChatMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];
  const pendingToolCalls: ToolCall[] = [];

  for (const message of messages) {
    // AI SDK accepts system content through `instructions`, not `messages`.
    if (message.role === MessageRole.SYSTEM) continue;
    if (message.role === MessageRole.USER && message.images?.length) {
      modelMessages.push({
        role: MessageRole.USER,
        content: [
          ...(message.content ? [{ type: AiSdkContentType.TEXT as "text", text: message.content }] : []),
          ...message.images.map((image) => ({
            type: AiSdkContentType.IMAGE as "image",
            image: image.base64.startsWith("data:") ? image.base64 : `data:image/jpeg;base64,${image.base64}`,
          })),
        ],
      });
      continue;
    }
    if (message.role === MessageRole.ASSISTANT && message.toolCalls?.length) {
      pendingToolCalls.push(...message.toolCalls);
      modelMessages.push({
        role: MessageRole.ASSISTANT,
        content: [
          ...(message.content ? [{ type: AiSdkContentType.TEXT as "text", text: message.content }] : []),
          ...message.toolCalls.map((call) => ({
            type: AiSdkContentType.TOOL_CALL as "tool-call",
            toolCallId: call.id,
            toolName: call.name,
            input: call.arguments,
          })),
        ],
      });
      continue;
    }
    if (message.role === MessageRole.TOOL) {
      const persistedId = message.toolCallId || message.tool_call_id;
      const toolName = message.toolName || message.tool_name;
      const matchedIndex = persistedId
        ? pendingToolCalls.findIndex((call) => call.id === persistedId)
        : toolName
          ? pendingToolCalls.findIndex((call) => call.name === toolName)
          : 0;
      const matchedCall = matchedIndex >= 0 ? pendingToolCalls.splice(matchedIndex, 1)[0] : undefined;

      // Never invent a tool-call ID. Providers require results to reference an
      // actual preceding call, so an unresolvable persisted result is omitted.
      if (!matchedCall) continue;
      modelMessages.push({
        role: MessageRole.TOOL,
        content: [
          {
            type: AiSdkContentType.TOOL_RESULT as "tool-result",
            toolCallId: matchedCall.id,
            toolName: toolName || matchedCall.name,
            output: { type: AiSdkContentType.TEXT as "text", value: message.content },
          },
        ],
      });
      continue;
    }
    modelMessages.push({ role: message.role, content: message.content });
  }
  return modelMessages;
}

export function toInstructions(messages: UnifiedChatMessage[]): string | undefined {
  const instructions = messages
    .filter((message) => message.role === MessageRole.SYSTEM && message.content.trim())
    .map((message) => message.content.trim());
  return instructions.length ? instructions.join("\n\n") : undefined;
}

export function toToolSet(
  tools?: Array<{
    type: `${AiSdkToolType}`;
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }>,
  executors?: Record<string, (input: Record<string, unknown>) => Promise<unknown>>,
) {
  if (!tools?.length) return undefined;
  return Object.fromEntries(
    tools.map((tool) => [
      tool.function.name,
      dynamicTool({
        description: tool.function.description,
        inputSchema: jsonSchema(tool.function.parameters),
        execute: executors?.[tool.function.name]
          ? (input: unknown) => executors[tool.function.name](input as Record<string, unknown>)
          : undefined,
      }),
    ]),
  ) as ToolSet;
}

export function reasoningOptions(provider: CustomProvider, effort?: `${ReasoningEffort}`) {
  if (!effort || effort === ReasoningEffort.NONE) return undefined;
  const key = provider.id.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
  return { [key]: { reasoningEffort: effort } };
}
