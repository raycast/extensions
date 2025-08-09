import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { Document } from "langchain/document";
import * as React from "react";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { OllamaApiChatMessage, OllamaApiTagsResponseModel } from "../../ollama/types";
import {
  AddSettingsCommandChat,
  GetSettingsCommandChatByIndex,
  SetSettingsCommandChatByIndex,
} from "../../settings/settings";
import { RaycastChat } from "../../settings/types";
import { Preferences, RaycastImage } from "../../types";
import { GetAvailableModel, PromptTokenParser } from "../function";
import { McpServerConfig } from "../../mcp/types";
import { McpClientMultiServer } from "../../mcp/mcp";
import { PromptContext } from "./type";
import { chatCompletion, GitHubChatMessage, GitHubContentPart, listCatalog, GitHubTool } from "../../github/api";
import "../../polyfill/node-fetch";
import { environment } from "@raycast/api";

// Simple debug logger
const DBG = (...args: any[]) => console.log(`[Chat][Inference]`, new Date().toISOString(), ...args);

// Helper to infer MIME type from file path (fallback to image/jpeg)
function inferMime(path?: string): string {
  if (!path) return "image/jpeg";
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

const preferences = getPreferenceValues<Preferences>();

let McpClient: McpClientMultiServer;

/**
 * Set Chat by given index.
 * @param i - index.
 * @param setChat - React SetChat Function.
 * @param setChatModelsAvailable - React SetChatModelsAvailabel Function.
 * @param setShowFormModel = React SetShowFormModel Function.
 */
export async function ChangeChat(
  i: number,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>,
  setShowFormModel: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  const c = await GetSettingsCommandChatByIndex(i).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setShowFormModel(true);
    return;
  });
  if (!c) return;

  // If this chat has no messages yet, align its main model with the current default
  try {
    if (!c.messages || c.messages.length === 0) {
      const prefs = getPreferenceValues<Preferences>();
      const cached = await LocalStorage.getItem<string>("github_default_model");
      const desired = cached || prefs.defaultModel || "openai/gpt-4.1";
      if (desired && c.models?.main?.tag !== desired) {
        c.models.main.tag = desired;
        await SetSettingsCommandChatByIndex(i, c);
      }
    }
  } catch {
    // ignore alignment errors
  }

  const vi = await VerifyChatModelInstalled(
    c.models.main.server_name,
    c.models.main.tag,
    c.models.embedding?.server_name,
    c.models.embedding?.tag,
    c.models.vision?.server_name,
    c.models.vision?.tag
  ).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setChatModelsAvailable(false);
  });
  setChat(c);
  if (vi) setChatModelsAvailable(true);
}

/**
 * Verify if configured model are stiil installed on eatch server.
 * @param ms - Main Model Server Name
 * @param mt - Main Model Tag
 * @param es - Embedding Model Server Name
 * @param et - Embedding Model Tag
 * @param vs - Vision Model Server Name
 * @param vt - Vision Model Tag
 * @returns Return `true` if all configured model are installed.
 */
async function VerifyChatModelInstalled(
  ms: string,
  mt: string,
  es?: string,
  et?: string,
  vs?: string,
  vt?: string
): Promise<boolean> {
  const am: Map<string, OllamaApiTagsResponseModel[]> = new Map();
  am.set(ms, await GetAvailableModel(ms));
  if ((am.get(ms) as OllamaApiTagsResponseModel[]).filter((v) => v.name === mt).length === 0) return false;
  if (es && et && !am.has(es)) am.set(es, await GetAvailableModel(es));
  if (es && et && (am.get(es) as OllamaApiTagsResponseModel[]).filter((v) => v.name === et).length === 0) return false;
  if (vs && vt && !am.has(vs)) am.set(vs, await GetAvailableModel(vs));
  if (vs && vt && (am.get(vs) as OllamaApiTagsResponseModel[]).filter((v) => v.name === vt).length === 0) return false;
  return true;
}

/**
 * Create New Empty Conversation.
 * @param chat - Selected Chat, used for copy models settings.
 * @param setChatNameIndex - React SetChatNameIndex Function.
 * @param revalidate - React RevalidateChatNames Function.
 */
export async function NewChat(
  chat: RaycastChat,
  setChatNameIndex: React.Dispatch<React.SetStateAction<number>>,
  revalidate: () => Promise<string[]>
): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const cached = await LocalStorage.getItem<string>("github_default_model");
  const desired = cached || prefs.defaultModel || "openai/gpt-4.1";
  const cn: RaycastChat = {
    name: "New Chat",
    models: {
      main: {
        server_name: "GitHub",
        server: { url: "https://models.github.ai" },
        tag: desired,
      } as any,
    },
    messages: [],
  };
  await AddSettingsCommandChat(cn);
  await revalidate().then(() => setChatNameIndex(0));
}

/**
 * Set Clipboard
 * @return
 */
export function ClipboardConversation(chat?: RaycastChat): string {
  let clipboard = "";
  if (chat) {
    chat.messages.map(
      (value) => (clipboard += `Question:\n${value.messages[0].content}\n\nAnswer:${value.messages[1].content}\n\n`)
    );
  }
  return clipboard;
}

/**
 * Get Messages for Inference with Context data.
 * @param chat.
 * @param query - User Prompt.
 * @param image.
 * @param context.
 */
function GetMessagesForInference(
  chat: RaycastChat,
  query: string,
  image?: RaycastImage[],
  context?: PromptContext
): OllamaApiChatMessage[] {
  const messages: OllamaApiChatMessage[] = [];

  /* Slice Messages */
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => messages.push(...v.messages));

  /* Create Prompt */
  let content = query;
  if (context && (context.tools || context.documents)) {
    content = `Respond to the user's prompt using the provided context information. Cite sources with url when available.\nUser Prompt: '${query}'`;
    if (context.tools) content += `Context from Tools Calling: '${context.tools.data}'\n`;
    if (context.documents) content += `Context from Documents: ${context.documents}\n`;
  }

  /* Add User Query */
  messages.push({
    role: OllamaApiChatMessageRole.USER,
    content: content,
    images: image && image.map((i) => i.base64),
  });

  return messages;
}

/**
 * Initialize McpClient.
 */
async function InitMcpClient(): Promise<void> {
  const mcpServerConfigRaw = await LocalStorage.getItem<string>("mcp_server_config");
  if (!mcpServerConfigRaw) {
    throw "Mcp Servers are not configured";
  }
  const mcpServerConfig: McpServerConfig = JSON.parse(mcpServerConfigRaw);
  McpClient = new McpClientMultiServer(mcpServerConfig);
}

/** Enable/disable MCP for a chat */
export function isMcpEnabled(chat: RaycastChat | undefined): boolean {
  return Boolean((chat as any)?.mcp_enabled);
}
export function setMcpEnabled(chat: RaycastChat, enabled: boolean): RaycastChat {
  return { ...chat, mcp_enabled: enabled } as any;
}

async function buildMcpTools(): Promise<GitHubTool[]> {
  const mcpServerConfigRaw = await LocalStorage.getItem<string>("mcp_server_config");
  if (!mcpServerConfigRaw) {
    return [];
  }
  if (!McpClient) await InitMcpClient();
  const ollamaTools = await McpClient.GetToolsOllama(true);
  return ollamaTools as unknown as GitHubTool[];
}

/**
 * Inference Task.
 */
async function Inference(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  context: PromptContext,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference..." });

  const prefs = getPreferenceValues<Preferences>();
  const token = prefs.githubToken || "";

  // Determine which model to use, honoring the current default for non-image prompts
  const cachedDefault = await LocalStorage.getItem<string>("github_default_model");
  const desiredDefault = cachedDefault || prefs.defaultModel || "openai/gpt-4.1";

  let usedMain = true;
  let model = { ...chat.models.main } as any;
  if (image && chat.models.vision) {
    usedMain = false;
    model = { ...chat.models.vision } as any;
  }
  if (image && (!chat.models.vision || !chat.models.vision.tag)) {
    try {
      const catalog = await listCatalog(token);
      const vision = catalog.find((m) => m.supported_input_modalities?.includes("image"));
      if (vision) {
        usedMain = false;
        model = { ...model, tag: vision.id } as any;
      }
    } catch (e) {
      // ignore vision fallback errors
    }
  }
  if (!image || image.length === 0) {
    model = { ...model, tag: desiredDefault };
    usedMain = true;
  }
  const usedTag = (model as any).tag;

  const messagesGh: GitHubChatMessage[] = [];
  const historyCount = chat.messages.length;
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => v.messages.forEach((m) => messagesGh.push({ role: m.role, content: m.content })));

  const latest = GetMessagesForInference(chat, query, image, context);
  const last = latest[latest.length - 1];
  let userContent: string | GitHubContentPart[] = last.content;
  if (image && image.length > 0) {
    const parts: GitHubContentPart[] = [{ type: "text", text: last.content }];
    for (const img of image) {
      const mime = inferMime(img.path);
      // IMPORTANT: send full base64, do not truncate
      parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${img.base64}` } });
    }
    userContent = parts;
  }
  messagesGh.push({ role: last.role, content: userContent });

  // Build tools if MCP is enabled and model likely supports tool-calling
  let tools: GitHubTool[] | undefined;
  if (isMcpEnabled(chat)) {
    try {
      tools = await buildMcpTools();
    } catch (e) {
      // ignore tool build errors
    }
  } else {
    const configPath = `${environment.supportPath}/servers/mcp-config.json`;
    console.log(configPath);
  }

  const ml = chat.messages.length;

  try {
    let resp = await chatCompletion(
      token,
      usedTag,
      messagesGh,
      tools && tools.length > 0 ? { tools, tool_choice: "auto" } : undefined
    );

    let answer = resp.choices?.[0]?.message?.content || "";

    // Handle tool calls if any
    const toolCalls = resp.choices?.[0]?.message?.tool_calls || [];
    if (tools && tools.length > 0 && toolCalls.length) {
      // Convert tool calls to our MCP format and execute
      const toExec = toolCalls.map((tc) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(tc.function.arguments || "{}");
        } catch (e) {
          // ignore JSON parse errors
        }
        return { function: { name: tc.function.name, arguments: parsed } } as any;
      });

      try {
        if (!McpClient) await InitMcpClient();
        const results = await McpClient.CallToolsForOllama(toExec);

        // Append tool results as an assistant tool output then user follow-up
        messagesGh.push({ role: "assistant", content: answer });
        messagesGh.push({ role: "assistant", content: `Tool results: ${JSON.stringify(results).slice(0, 512)}...` });

        resp = await chatCompletion(token, usedTag, messagesGh, { tools, tool_choice: "none" });
        answer = resp.choices?.[0]?.message?.content || answer;
      } catch (err) {
        // ignore MCP execution errors
      }
    }

    // append new message and persist model change for ongoing chat when applicable
    setChat((prevState) => {
      if (!prevState) return prevState;
      if (prevState.messages.length === ml) {
        const nextModels = usedMain
          ? { ...prevState.models, main: { ...prevState.models.main, tag: usedTag } }
          : prevState.models;
        const next = {
          ...prevState,
          models: nextModels,
          mcp_enabled: isMcpEnabled(prevState),
          messages: prevState.messages.concat({
            model: usedTag,
            created_at: new Date().toISOString(),
            images: image,
            files:
              documents && documents.map((d) => (d as any).metadata?.source).filter((v, i, a) => a.indexOf(v) === i),
            messages: [
              { role: OllamaApiChatMessageRole.USER, content: query },
              { role: OllamaApiChatMessageRole.ASSISTANT, content: answer },
            ],
            done: true,
          } as any),
        } as any;
        return next;
      } else {
        return prevState;
      }
    });
    await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
  } catch (e: any) {
    await showToast({ style: Toast.Style.Failure, title: "Error:", message: String(e?.message || e) });
  } finally {
    setLoading(false);
  }
}

function DocumentsToJson(documents: Document<Record<string, any>>[]): string {
  const o: any[] = [];
  for (const document of documents) {
    o.push({ source: (document as any).metadata?.source, content: document.pageContent });
  }
  return JSON.stringify(o);
}

export async function Run(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  setLoading(true);

  const context: PromptContext = {};

  /* Parse token on query */
  query = await PromptTokenParser(query);

  /* If documents are defined add them to the context */
  if (documents) context.documents = DocumentsToJson(documents);

  /* Start Inference */
  await Inference(query, image, documents, context, chat, setChat, setLoading);
}
