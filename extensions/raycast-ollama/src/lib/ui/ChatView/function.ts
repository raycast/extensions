import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import * as React from "react";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { Ollama } from "../../ollama/ollama";
import {
  OllamaApiChatMessage,
  OllamaApiChatRequestBody,
  OllamaApiChatResponse,
  OllamaApiTagsResponseModel,
} from "../../ollama/types";
import { AddSettingsCommandChat, GetSettingsCommandChatByIndex } from "../../settings/settings";
import { RaycastChat } from "../../settings/types";
import { Preferences, RaycastImage } from "../../types";
import { GetAvailableModel, PromptTokenParser } from "../function";
import { McpServerConfig, McpToolInfo } from "../../mcp/types";
import { McpClientMultiServer } from "../../mcp/mcp";
import { PromptContext } from "./type";
import "../../polyfill/node-fetch";

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
  const vi = await VerifyChatModelInstalled(
    c.models.main.server_name,
    c.models.main.tag,
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
async function VerifyChatModelInstalled(ms: string, mt: string, vs?: string, vt?: string): Promise<boolean> {
  const am: Map<string, OllamaApiTagsResponseModel[]> = new Map();
  am.set(ms, await GetAvailableModel(ms));
  if ((am.get(ms) as OllamaApiTagsResponseModel[]).filter((v) => v.name === mt).length === 0) return false;
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
  const cn: RaycastChat = {
    name: "New Chat",
    models: chat.models,
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
  if (context && context.tools) {
    content = `Respond to the user's prompt using the provided context information. Cite sources with url when available.\nUser Prompt: '${query}'`;
    if (context.tools) content += `Context from Tools Calling: '${context.tools.data}'\n`;
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
  if (!mcpServerConfigRaw) throw "Mcp Servers are not configured";
  const mcpServerConfig: McpServerConfig = JSON.parse(mcpServerConfigRaw);
  McpClient = new McpClientMultiServer(mcpServerConfig);
}

/**
 * Inference with tools from Mcp Servers.
 * @param query - User Prompt.
 * @param chat.
 * @param image.
 */
async function ToolsCall(
  query: string,
  chat: RaycastChat,
  image?: RaycastImage[]
): Promise<[string | undefined, McpToolInfo[] | undefined]> {
  await showToast({ style: Toast.Style.Animated, title: "🔧 Tool Calling..." });

  /* Initialize McpClient if undefined. */
  if (McpClient === undefined) {
    await InitMcpClient().catch((e) => {
      showToast({ title: "Error", message: e, style: Toast.Style.Failure });
    });
    if (McpClient === undefined) {
      delete chat.mcp_server;
      return [undefined, undefined];
    }
  }

  /* Select model tag to use. */
  let model = chat.models.main;
  if (chat.models.tools) model = chat.models.tools;

  /* Get Tools */
  const tools = await McpClient.GetToolsOllama(true, chat.mcp_server);

  /* Inference with tools */
  const o = new Ollama(model.server);
  const body: OllamaApiChatRequestBody = {
    model: model.tag,
    messages: GetMessagesForInference(chat, query, image),
    keep_alive: model.keep_alive,
    tools: tools,
  };
  const response = await o.OllamaApiChatNoStream(body);

  /* Call tools on Mcp Server */
  if (response.message?.tool_calls) {
    /* Get Mcp Tools Info */
    const toolsInfo = McpClient.GetToolsInfoForOllama(response.message.tool_calls);

    /* Call tools */
    const data = await McpClient.CallToolsForOllama(response.message.tool_calls);

    if (data.length > 0) return [JSON.stringify(data), toolsInfo];
  }

  return [undefined, undefined];
}

/**
 * Inference Task.
 */
async function Inference(
  query: string,
  image: RaycastImage[] | undefined,
  context: PromptContext,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference..." });

  let model = chat.models.main;
  if (image && chat.models.vision) model = chat.models.vision;

  const body: OllamaApiChatRequestBody = {
    model: model.tag,
    messages: GetMessagesForInference(chat, query, image, context),
    keep_alive: model.keep_alive,
  };

  const ml = chat.messages.length;
  const o = new Ollama(model.server);
  o.OllamaApiChat(body)
    .then(async (emiter) => {
      emiter.on("data", (data: string) => {
        setChat((prevState) => {
          if (prevState) {
            if (prevState.messages.length === ml) {
              return {
                ...prevState,
                messages: prevState.messages.concat({
                  model: chat.models.main.tag,
                  created_at: "",
                  images: image,
                  messages: [
                    { role: OllamaApiChatMessageRole.USER, content: query },
                    { role: OllamaApiChatMessageRole.ASSISTANT, content: data },
                  ],
                  done: false,
                }),
              };
            } else {
              const m: RaycastChat = JSON.parse(JSON.stringify(prevState));
              m.messages[m.messages.length - 1].messages[1].content += data;
              return {
                ...prevState,
                messages: m.messages,
              };
            }
          }
        });
      });
      emiter.on("done", async (data: OllamaApiChatResponse) => {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setChat((prevState) => {
          if (prevState) {
            const m: RaycastChat = JSON.parse(JSON.stringify(prevState));
            m.messages[m.messages.length - 1] = {
              ...data,
              images: image,
              tools: context.tools && context.tools.meta,
              messages: m.messages[m.messages.length - 1].messages,
            };
            setLoading(false);
            return { ...m };
          }
        });
      });
    })
    .catch(async (e: Error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error:", message: e.message });
      setLoading(false);
    });
}

export async function Run(
  query: string,
  image: RaycastImage[] | undefined,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  setLoading(true);

  const context: PromptContext = {};

  /* Parse token on query */
  query = await PromptTokenParser(query);

  /* Call Tools of mcp_server is defined */
  if (chat.mcp_server) {
    const [data, meta] = await ToolsCall(query, chat, image);
    if (data && meta) context.tools = { data: data, meta: meta };
  }

  /* Start Inference */
  await Inference(query, image, context, chat, setChat, setLoading);
}
