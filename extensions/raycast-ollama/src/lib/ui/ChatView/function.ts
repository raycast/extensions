import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import * as React from "react";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { Ollama } from "../../ollama/ollama";
import {
  OllamaApiChatMessage,
  OllamaApiChatMessageToolCall,
  OllamaApiChatRequestBody,
  OllamaApiChatResponse,
  OllamaApiTagsResponseModel,
} from "../../ollama/types";
import { AddSettingsCommandChat, GetSettingsCommandChatByIndex } from "../../settings/settings";
import { RaycastChat } from "../../settings/types";
import { RaycastImage } from "../../types";
import { GetAvailableModel, PromptTokenParser } from "../function";
import { GetOllamaApiTools, Tool, ToolResult } from "./tools/main";
import { ToolsOllama } from "./tools/ollama";
import { getSystemPrompt } from "./prompt";
import { McpServerConfig } from "../types";
import { ToolMcp } from "./tools/mcp";

const preferences = getPreferenceValues<Preferences>();

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
  setShowFormModel: React.Dispatch<React.SetStateAction<boolean>>,
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
    c.models.vision?.tag,
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
  revalidate: () => Promise<string[]>,
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
    for (const msg of chat.messages)
      for (const m of msg.messages) {
        if (m.role === OllamaApiChatMessageRole.USER) clipboard += `Question:\n${m.content}\n\n`;
        else if (m.role === OllamaApiChatMessageRole.ASSISTANT) clipboard += `Answer:\n${m.content}\n\n`;
        else if (m.role === OllamaApiChatMessageRole.TOOL && m.tool_name)
          clipboard += `Tool Calls Name: "${m.tool_name}", Content: ${m.content}`;
      }
  }
  return clipboard;
}

/**
 * Get Messages for Inference with Context data.
 * @param chat.
 * @param query - User Prompt.
 * @param image.
 */
function GetMessagesForInference(chat: RaycastChat, query: string, image?: RaycastImage[]): OllamaApiChatMessage[] {
  const messages: OllamaApiChatMessage[] = [];

  /* Add System Prompt */
  messages.push({ role: OllamaApiChatMessageRole.SYSTEM, content: getSystemPrompt() });

  /* Slice Messages */
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => messages.push(...v.messages));

  /* Add User Query */
  messages.push({
    role: OllamaApiChatMessageRole.USER,
    content: query,
    images: image && image.map((i) => i.base64),
  });

  return messages;
}

/* Get Mcp Server Tools */
async function ToolsMcp(mcpServerNames: string[]): Promise<Tool[]> {
  const tools: Tool[] = [];

  /* Get Configures Mcp Server from LocalStorage */
  let config: McpServerConfig;
  try {
    const configRaw = await LocalStorage.getItem<string>("mcp_server_config");
    if (!configRaw) return tools;
    config = JSON.parse(configRaw);
  } catch (error) {
    console.error(error);
    if (error instanceof Error)
      await showToast({ style: Toast.Style.Failure, title: "Error Loading Mcp Server Config", message: error.message });
    return tools;
  }

  /* Get Tools from all Mcp Server */
  for (const name of mcpServerNames) {
    /* Get Mcp Server Param */
    const c = config.mcpServers[name];
    if (!c) continue;

    /* Get Tools */
    try {
      const t = await ToolMcp(config.mcpServers[name]);
      tools.push(...t);
    } catch (error) {
      console.error(error);
      if (error instanceof Error)
        await showToast({ style: Toast.Style.Failure, title: `Error on Mcp Server "${name}"`, message: error.message });
    }
  }

  return tools;
}

/**
 * Inference Task.
 */
async function Inference(
  query: string,
  image: RaycastImage[] | undefined,
  tools: Tool[],
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "💾 Loading..." });

  const msgRequestBody: OllamaApiChatMessage[] = GetMessagesForInference(chat, query, image);
  let isFirstMessage = true;

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    let thinkingStarted = false;
    let responseStarted = false;

    /* Set Model */
    let model = chat.models.main;
    if (tools.length && chat.models.tools) {
      model = chat.models.tools;
    } else if (image && chat.models.vision) {
      model = chat.models.vision;
    }

    /* Init Ollama Client and set Request Body */
    const o = new Ollama(model.server);
    const body: OllamaApiChatRequestBody = {
      model: model.tag,
      messages: msgRequestBody,
      think: model.thinking,
      keep_alive: model.keep_alive,
    };

    /* Init Tools Array and Add Tools into the body */
    const toolCalls: Promise<ToolResult>[] = [];
    if (tools.length) body.tools = GetOllamaApiTools(tools);

    try {
      await showToast({ style: Toast.Style.Animated, title: "💾 Loading..." });
      const emiter = await o.OllamaApiChat(body);

      /* Push first Assistant message and save changes with setChat() */
      msgRequestBody.push({ role: OllamaApiChatMessageRole.ASSISTANT, content: "" });
      if (isFirstMessage) {
        setChat((prevState) => {
          if (!prevState) return undefined;
          return {
            ...prevState,
            messages: [
              ...prevState.messages,
              {
                model: model.tag,
                created_at: "",
                images: image,
                messages: [
                  { role: OllamaApiChatMessageRole.USER, content: query },
                  { role: OllamaApiChatMessageRole.ASSISTANT, content: "" },
                ],
                done: false,
              },
            ],
          };
        });
        isFirstMessage = false;
      } else {
        setChat((prevState) => {
          if (!prevState) return undefined;

          /* Push new Assistant Message on last Message */
          const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
            /* Skip all value except last */
            if (groupIndex != groupArr.length - 1) return group;

            return {
              ...group,
              messages: group.messages.concat([{ role: OllamaApiChatMessageRole.ASSISTANT, content: "" }]),
            };
          });

          return { ...prevState, messages: updatedMessages };
        });
      }

      const processEmiter = () => {
        /* Get Tools Call */
        emiter.on("tool_calls", (data: OllamaApiChatMessageToolCall[]) => {
          /* Push "tool_calls" on messages */
          const message = msgRequestBody.findLast((v) => v.role === OllamaApiChatMessageRole.ASSISTANT);
          if (message?.tool_calls) message.tool_calls.push(...data);
          else if (message) message.tool_calls = data;

          setChat((prevState) => {
            if (!prevState) return undefined;

            /* Update tool_calls of last Assistant Message */
            const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
              /* Skip all value except last */
              if (groupIndex != groupArr.length - 1) return group;

              const updatedMsg = group.messages.map((value, valueIndex, valueArr) => {
                const isLastAssistant =
                  value.role === OllamaApiChatMessageRole.ASSISTANT &&
                  valueIndex === valueArr.findLastIndex((v) => v.role === OllamaApiChatMessageRole.ASSISTANT);

                /* Skip all value except last Assistant Message */
                if (!isLastAssistant) return value;

                return { ...value, tool_calls: [...(value.tool_calls ?? []), ...data] };
              });

              return { ...group, messages: updatedMsg };
            });

            return { ...prevState, messages: updatedMessages };
          });

          /* Push Tool Function into Array */
          for (const toolcall of data) {
            const tool = tools.find((v) => v.name === toolcall.function.name);
            if (tool) toolCalls.push(tool.fn(toolcall.function.arguments));
          }
        });

        /* Get Thinking Text */
        emiter.on("thinking", async (data: string) => {
          /* showToast when thinking process started */
          if (!thinkingStarted) {
            thinkingStarted = true;
            await showToast({ style: Toast.Style.Animated, title: "🤔 Thinking..." });
          }

          const msgAssistant = msgRequestBody.findLast((v) => v.role === OllamaApiChatMessageRole.ASSISTANT);
          if (msgAssistant) msgAssistant.thinking = (msgAssistant.thinking ?? "") + data;
          setChat((prevState) => {
            if (!prevState) return undefined;

            /* Update thinking of last Assistant Message */
            const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
              /* Skip all value except last */
              if (groupIndex != groupArr.length - 1) return group;

              const updatedMsg = group.messages.map((value, valueIndex, valueArr) => {
                const isLastAssistant =
                  value.role === OllamaApiChatMessageRole.ASSISTANT &&
                  valueIndex === valueArr.findLastIndex((v) => v.role === OllamaApiChatMessageRole.ASSISTANT);

                /* Skip all value except last Assistant Message */
                if (!isLastAssistant) return value;

                return { ...value, thinking: (value.thinking ?? "") + data };
              });

              return { ...group, messages: updatedMsg };
            });

            return { ...prevState, messages: updatedMessages };
          });
        });

        /* Get Response Text */
        emiter.on("data", async (data: string) => {
          /* showToast when  process started */
          if (!responseStarted) {
            responseStarted = true;
            await showToast({ style: Toast.Style.Animated, title: "✍️ Typing..." });
          }

          setChat((prevState) => {
            if (!prevState) return undefined;

            /* Update content of last Assistant Message */
            const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
              /* Skip all value except last */
              if (groupIndex != groupArr.length - 1) return group;

              const updatedMsg = group.messages.map((value, valueIndex, valueArr) => {
                const isLastAssistant =
                  value.role === OllamaApiChatMessageRole.ASSISTANT &&
                  valueIndex === valueArr.findLastIndex((v) => v.role === OllamaApiChatMessageRole.ASSISTANT);

                /* Skip all value except last Assistant Message */
                if (!isLastAssistant) return value;

                return { ...value, content: value.content + data };
              });

              return { ...group, messages: updatedMsg };
            });

            return { ...prevState, messages: updatedMessages };
          });
        });
      };
      processEmiter();

      /* Get Metadata */
      await new Promise<void>((resolve) => {
        emiter.once("done", async (data: OllamaApiChatResponse) => {
          /* Continue Iteration on ToolCalls */
          if (toolCalls.length) {
            await showToast({ style: Toast.Style.Animated, title: "🧰 Tool Calling..." });

            const promises = await Promise.all(toolCalls);
            const toolMessages: OllamaApiChatMessage[] = promises.map(
              (v) => <OllamaApiChatMessage>{ ...v, role: OllamaApiChatMessageRole.TOOL },
            );
            msgRequestBody.push(...toolMessages);

            setChat((prevState) => {
              if (!prevState) return undefined;

              /* Push Tool Messages on last Message */
              const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
                /* Skip all value except last */
                if (groupIndex != groupArr.length - 1) return group;

                return { ...group, messages: group.messages.concat(toolMessages) };
              });

              return { ...prevState, messages: updatedMessages };
            });
          } else {
            /* Set Last Message */
            await showToast({ style: Toast.Style.Success, title: "👍 Done." });
            setChat((prevState) => {
              if (!prevState) return undefined;

              /* Update Metadata of last Message */
              const updatedMessages = prevState.messages.map((group, groupIndex, groupArr) => {
                /* Skip all value except last */
                if (groupIndex != groupArr.length - 1) return group;

                return { ...data, images: image, messages: group.messages };
              });

              return { ...prevState, messages: updatedMessages };
            });
          }
          resolve();
        });
      });
      emiter.removeAllListeners();

      /* Brake Loop if no tool was required */
      if (!toolCalls.length) {
        break;
      }
    } catch (e) {
      if (e instanceof Error) await showToast({ style: Toast.Style.Failure, title: "Error:", message: e.message });
      break;
    }
  }
  setLoading(false);
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

  /* Parse token on query */
  query = await PromptTokenParser(query);

  /* Load Enabled Tools */
  const tools: Tool[] = [];
  /* Load Ollama Api Tools if Enabled */
  if (toolsOllamaEnabled) tools.push(...ToolsOllama());
  /* Load Tools from Mcp Server */
  if (chat.mcp_server?.length) {
    const t = await ToolsMcp(chat.mcp_server);
    tools.push(...t);
  }

  /* Start Inference */
  await Inference(query, image, tools, chat, setChat, setLoading);
}
