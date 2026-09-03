import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import * as React from "react";
import { stepCountIs, streamText } from "ai";
import { AddSettingsCommandChat, GetSettingsCommandChatByIndex } from "../../settings/settings";
import { RaycastChat } from "../../settings/types";
import { RaycastImage } from "../../types";
import { ChatMessage, MessageRole } from "../../inference/types";
import { GetModels, PromptTokenParser } from "../function";
import { McpServerConfig } from "../types";
import { getCustomProvider } from "../../providers/unified-provider";
import {
  createLanguageModel,
  reasoningOptions,
  toInstructions,
  toModelMessages,
  toToolSet,
} from "../../providers/ai-sdk";
import { Tool, ToolResult } from "./tools/main";
import { ToolsOllama } from "./tools/ollama";
import { ToolMcp } from "./tools/mcp";
import { getSystemPrompt } from "./prompt";

const preferences = getPreferenceValues<Preferences>();

export async function ChangeChat(
  index: number,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>,
  setShowFormModel: React.Dispatch<React.SetStateAction<boolean>>,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const chat = await GetSettingsCommandChatByIndex(index).catch(async (error) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: String(error) });
    setShowFormModel(true);
    return undefined;
  });
  if (!chat || !isCurrent()) return;
  // Model discovery is optional for OpenAI-compatible providers. A provider
  // may intentionally use manually configured models or be temporarily
  // offline, neither of which should make an existing conversation unusable.
  setChatModelsAvailable(true);
  if (!isCurrent()) return;
  setChat(chat);
}

export async function NewChat(
  chat: RaycastChat,
  setChatNameIndex: React.Dispatch<React.SetStateAction<number>>,
  revalidate: () => Promise<string[]>,
): Promise<void> {
  await AddSettingsCommandChat({ name: "New Chat", models: chat.models, messages: [] });
  await revalidate();
  setChatNameIndex(0);
}

export function ClipboardConversation(chat?: RaycastChat): string {
  if (!chat) return "";
  return chat.messages
    .flatMap((group) => group.messages)
    .map((message) => {
      if (message.role === MessageRole.USER) return `Question:\n${message.content}\n`;
      if (message.role === MessageRole.ASSISTANT) return `Answer:\n${message.content}\n`;
      if (message.role === MessageRole.TOOL && message.toolName)
        return `Tool Call: ${message.toolName}\n${message.content}\n`;
      return "";
    })
    .join("\n");
}

function inferenceMessages(chat: RaycastChat, query: string, images?: RaycastImage[]): ChatMessage[] {
  return [
    { role: MessageRole.SYSTEM, content: getSystemPrompt() },
    ...chat.messages.slice(-Number(preferences.chatHistoryMessagesNumber)).flatMap((group) => group.messages),
    { role: MessageRole.USER, content: query, images },
  ];
}

async function toolsFromMcp(serverNames: string[]): Promise<Tool[]> {
  try {
    const raw = await LocalStorage.getItem<string>("mcp_server_config");
    if (!raw) return [];
    const config: McpServerConfig = JSON.parse(raw);
    return (
      await Promise.all(
        serverNames.filter((name) => config.mcpServers[name]).map((name) => ToolMcp(config.mcpServers[name])),
      )
    ).flat();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error Loading MCP Tools", message: String(error) });
    return [];
  }
}

async function modelSupportsTools(serverName: string, modelTag: string): Promise<boolean> {
  return Boolean(
    (await GetModels())
      .get(serverName)
      ?.find((model) => model.name === modelTag)
      ?.capabilities?.includes("tools"),
  );
}

function appendChatToken(
  chat: RaycastChat | undefined,
  field: "content" | "reasoning",
  token: string,
): RaycastChat | undefined {
  if (!chat) return undefined;
  const messages = chat.messages.map((group, index, groups) => {
    if (index !== groups.length - 1) return group;
    const lastAssistant = group.messages.findLastIndex((message) => message.role === MessageRole.ASSISTANT);
    return {
      ...group,
      messages: group.messages.map((message, messageIndex) =>
        messageIndex === lastAssistant ? { ...message, [field]: (message[field] ?? "") + token } : message,
      ),
    };
  });
  return { ...chat, messages };
}

function appendToolCall(
  chat: RaycastChat | undefined,
  toolCall: { id: string; name: string; arguments: Record<string, unknown> },
): RaycastChat | undefined {
  if (!chat) return undefined;
  return {
    ...chat,
    messages: chat.messages.map((group, index, groups) => {
      if (index !== groups.length - 1) return group;
      const assistantIndex = group.messages.findLastIndex((message) => message.role === MessageRole.ASSISTANT);
      if (assistantIndex < 0) return group;
      return {
        ...group,
        messages: group.messages.map((message, messageIndex) => {
          if (messageIndex !== assistantIndex) return message;
          const toolCalls = message.toolCalls || [];
          if (toolCalls.some((call) => call.id === toolCall.id)) return message;
          return { ...message, toolCalls: [...toolCalls, toolCall] };
        }),
      };
    }),
  };
}

function appendToolResult(
  chat: RaycastChat | undefined,
  toolResult: { id: string; name: string; content: string },
): RaycastChat | undefined {
  if (!chat) return undefined;
  return {
    ...chat,
    messages: chat.messages.map((group, index, groups) => {
      if (index !== groups.length - 1) return group;
      const result = {
        role: MessageRole.TOOL,
        content: toolResult.content,
        toolName: toolResult.name,
        toolCallId: toolResult.id,
      };
      const existingIndex = group.messages.findIndex(
        (message) => message.role === MessageRole.TOOL && message.toolCallId === toolResult.id,
      );
      return {
        ...group,
        messages:
          existingIndex < 0
            ? [...group.messages, result]
            : group.messages.map((message, messageIndex) => (messageIndex === existingIndex ? result : message)),
      };
    }),
  };
}

function serializeToolOutput(output: unknown): string {
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

async function Inference(
  query: string,
  images: RaycastImage[] | undefined,
  tools: Tool[],
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
): Promise<void> {
  const model =
    tools.length && chat.models.tools
      ? chat.models.tools
      : images && chat.models.vision
        ? chat.models.vision
        : chat.models.main;
  const provider = await getCustomProvider(model.server_name);
  if (!provider) throw new Error(`Provider '${model.server_name}' is not configured`);
  const messages = inferenceMessages(chat, query, images);
  setChat(
    (current) =>
      current && {
        ...current,
        messages: [
          ...current.messages,
          {
            model: model.tag,
            created_at: new Date().toISOString(),
            images,
            done: false,
            messages: [
              { role: MessageRole.USER, content: query, images },
              { role: MessageRole.ASSISTANT, content: "" },
            ],
          },
        ],
      },
  );
  const enabledTools = tools.length && (await modelSupportsTools(model.server_name, model.tag)) ? tools : [];
  const toolDefinitions = enabledTools.map((tool) => ({
    type: "function" as const,
    function: { name: tool.name, description: tool.description || tool.name, parameters: tool.parameters },
  }));
  const executors = Object.fromEntries(
    enabledTools.map((tool) => [tool.name, (input: Record<string, unknown>): Promise<ToolResult> => tool.fn(input)]),
  );
  const result = streamText({
    model: createLanguageModel(provider)(model.tag),
    instructions: toInstructions(messages),
    messages: toModelMessages(messages),
    tools: toToolSet(toolDefinitions, executors),
    stopWhen: stepCountIs(8),
    temperature: 0.7,
    providerOptions: reasoningOptions(provider, model.thinking === false ? "none" : model.thinking),
  });
  let reasoningStarted = false;
  let textStarted = false;
  for await (const part of result.fullStream) {
    if (part.type === "reasoning-delta") {
      if (!reasoningStarted) await showToast({ style: Toast.Style.Animated, title: "🤔 Thinking..." });
      reasoningStarted = true;
      setChat((current) => appendChatToken(current, "reasoning", part.text));
    }
    if (part.type === "text-delta") {
      if (!textStarted) await showToast({ style: Toast.Style.Animated, title: "✍️ Typing..." });
      textStarted = true;
      setChat((current) => appendChatToken(current, "content", part.text));
    }
    if (part.type === "tool-call") {
      setChat((current) =>
        appendToolCall(current, {
          id: part.toolCallId,
          name: part.toolName,
          arguments: (part.input || {}) as Record<string, unknown>,
        }),
      );
    }
    if (part.type === "tool-result" && !part.preliminary) {
      setChat((current) =>
        appendToolResult(current, {
          id: part.toolCallId,
          name: part.toolName,
          content: serializeToolOutput(part.output),
        }),
      );
    }
    if (part.type === "tool-error") {
      setChat((current) =>
        appendToolResult(current, {
          id: part.toolCallId,
          name: part.toolName,
          content: serializeToolOutput(part.error),
        }),
      );
    }
  }
  setChat(
    (current) =>
      current && {
        ...current,
        messages: current.messages.map((group, index, groups) =>
          index === groups.length - 1 ? { ...group, done: true } : group,
        ),
      },
  );
  await showToast({ style: Toast.Style.Success, title: "👍 Done." });
}

export async function Run(
  query: string,
  image: RaycastImage[] | undefined,
  toolsOllamaEnabled: boolean,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> {
  setLoading(true);
  try {
    const tools = toolsOllamaEnabled ? ToolsOllama() : [];
    if (chat.mcp_server?.length) tools.push(...(await toolsFromMcp(chat.mcp_server)));
    await Inference(await PromptTokenParser(query), image, tools, chat, setChat);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Inference failed", message: String(error) });
  } finally {
    setLoading(false);
  }
}
