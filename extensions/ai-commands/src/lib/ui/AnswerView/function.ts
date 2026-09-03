import * as Types from "./types";
import * as React from "react";
import { Ollama } from "../../ollama/ollama";
import { OllamaApiGenerateRequestBody, OllamaApiGenerateResponse, ThinkingEffort } from "../../ollama/types";
import { CommandAnswer } from "../../settings/enum";
import { COMMANDS_INFO } from "../../settings/defaultPrompts";
import { AddSettingsCommandChat, GetOllamaServerByName, GetSettingsCommandAnswer } from "../../settings/settings";
import { Clipboard, getPreferenceValues, launchCommand, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { GetAvailableModel, PromptTokenImageParser, PromptTokenParser, GetPromptTokenSelectionText } from "../function";
export { GetPromptTokenSelectionText };
import { Creativity } from "../../enum";
import { RaycastChat, RaycastChatMessage, SettingsCommandAnswer } from "../../settings/types";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { RaycastImage } from "../../types";
import {
  formatCustomServerName,
  getCustomClient,
  getCustomModel,
  getCustomProvider,
  isCustomServer,
} from "../../providers/unified-provider";
import { OpenAiClient } from "../../providers/openai-client";

/**
 * Get Types.UiModel.
 * @param command - Command Type.
 * @param server - Ollama Server Name or Custom Provider Name.
 * @param model - Model Tag Name.
 * @param Types.UiModel.
 */
export async function GetModel(command?: CommandAnswer, server?: string, model?: string): Promise<Types.UiModel> {
  let settings: SettingsCommandAnswer | undefined;
  if (command) {
    try {
      settings = await GetSettingsCommandAnswer(command);
      server = settings.server;
      model = settings.model.main.tag;
    } catch (e) {
      const pref = getPreferenceValues<Preferences>();
      if (pref.ollamaUseDefaultModelAsFallback && pref.ollamaDefaultModel) {
        server = "Local";
        model = pref.ollamaDefaultModel;
      } else {
        throw e;
      }
    }
  } else if (!server || !model) throw new Error("server and model need to be defined");

  if (isCustomServer(server)) {
    const customProvider = await getCustomProvider(server);
    if (!customProvider) throw new Error(`Custom provider '${server}' not found`);
    let customModel = getCustomModel(customProvider, model);
    if (!customModel) {
      customModel = {
        id: model,
        name: model,
        context: 128000,
        abilities: {
          temperature: { supported: true },
          vision: { supported: true },
          tools: { supported: true },
          system_message: { supported: true },
        },
      };
    }

    const client = new OpenAiClient(customProvider, customModel);
    return {
      server: {
        name: formatCustomServerName(customProvider),
        customClient: client,
      },
      tag: {
        name: customModel.id,
        modified_at: "",
        size: customModel.context || 0,
        digest: "",
        details: {
          parent_model: "",
          format: "",
          family: "",
          families: [],
          parameter_size: "",
          quantization_level: "",
        },
      },
      thinking: settings?.model.main.thinking,
      keep_alive: settings?.model.main.keep_alive,
      prompt: settings?.prompt,
      action: settings?.action,
    };
  }

  const s = await GetOllamaServerByName(server);
  const m = (await GetAvailableModel(server)).filter((m) => m.name === model);
  if (m.length < 1) throw new Error("Model unavailable on given server");
  return {
    server: {
      name: server,
      ollama: new Ollama(s),
    },
    tag: m[0],
    thinking: settings?.model.main.thinking,
    keep_alive: settings?.model.main.keep_alive,
    prompt: settings?.prompt,
    action: settings?.action,
  };
}

/**
 * Convert answer into chat for continue conversation on "Chat with Ollama" command.
 * @param model
 * @param query
 * @param answer
 * @param answerMeta
 * @param openCommand? - `false` for avoiding open "Chat with Ollama" command.
 */
export async function convertAnswerToChat(
  model: Types.UiModel,
  query: string | undefined,
  images: RaycastImage[] | undefined,
  thinking: string | undefined,
  answer: string,
  answerMeta: OllamaApiGenerateResponse,
  openCommand = true,
  thinkingEffort?: ThinkingEffort,
): Promise<void> {
  const isCustom = isCustomServer(model.server.name);
  const server = isCustom ? undefined : await GetOllamaServerByName(model.server.name);
  const chat: RaycastChat = {
    name: query ? `${query.substring(0, 25)}...` : "New Chat",
    models: {
      main: {
        server: server,
        server_name: model.server.name,
        tag: model.tag.name,
        keep_alive: model.keep_alive,
        thinking: thinkingEffort ? thinkingEffort : model.thinking,
      },
    },
    messages: [
      {
        messages: [
          {
            role: OllamaApiChatMessageRole.User,
            content: query ? query : "",
            images: images ? images.map((i) => i.base64) : undefined,
          },
          {
            role: OllamaApiChatMessageRole.Assistant,
            thinking: thinking,
            content: answer,
          },
        ],
        images: images,
        ...answerMeta,
      },
    ],
  };
  await AddSettingsCommandChat(chat);
  if (openCommand) {
    try {
      await launchCommand({ name: "ai-chat", type: LaunchType.UserInitiated });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
    }
  }
}

/**
 * Start Inference with Ollama API.
 */
async function Inference(
  model: Types.UiModel,
  prompt: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setThinking: React.Dispatch<React.SetStateAction<string>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  images: string[] | undefined = undefined,
  creativity: Creativity = Creativity.Medium,
  thinking: ThinkingEffort = false,
  keep_alive?: string,
): Promise<void> {
  let thinkingStarted = false;
  let responseStarted = false;

  const body: OllamaApiGenerateRequestBody = {
    model: model.tag.name,
    prompt: prompt,
    images: images,
    think: thinking,
    options: {
      temperature: creativity,
    },
  };
  if (keep_alive) body.keep_alive = keep_alive;

  await showToast({ style: Toast.Style.Animated, title: "💾 Loading..." });
  try {
    let emiter;
    if (model.server.customClient || isCustomServer(model.server.name)) {
      const client = model.server.customClient || (await getCustomClient(model.server.name, model.tag.name));
      if (!client) throw new Error(`Could not initialize client for ${model.server.name}`);
      emiter = await client.chatStream({
        model: model.tag.name,
        messages: [
          {
            role: "user",
            content: prompt,
            images: images ? images.map((base64) => ({ path: "", html: "", base64 })) : undefined,
          },
        ],
        temperature: creativity,
      });
    } else {
      if (!model.server.ollama) throw new Error("Ollama client unavailable");
      emiter = await model.server.ollama.OllamaApiGenerate(body);
    }

    const processEmiter = () => {
      // Get Thinking Text
      emiter.on("thinking", async (data) => {
        // showToast when thinking process started
        if (!thinkingStarted) {
          thinkingStarted = true;
          await showToast({ style: Toast.Style.Animated, title: "🤔 Thinking..." });
        }
        setThinking((prevState) => prevState + data);
      });

      // Get Response Text
      emiter.on("data", async (data) => {
        // showToast when  process started
        if (!responseStarted) {
          responseStarted = true;
          await showToast({ style: Toast.Style.Animated, title: "✍️ Typing..." });
        }
        setAnswer((prevState) => prevState + data);
      });
    };
    processEmiter();

    // Get Metadata
    await new Promise<void>((resolve) => {
      emiter.on("done", async (data) => {
        await showToast({ style: Toast.Style.Success, title: "👍 Done." });
        setAnswerMetadata(data);
        setLoading(false);
        emiter.removeAllListeners();
        resolve();
      });
    });
  } catch (err) {
    if (err instanceof Error) await showToast({ style: Toast.Style.Failure, title: err.message });
    setLoading(false);
  }
}

/**
 * Run Command
 */
export async function Run(
  model: Types.UiModel,
  prompt: string,
  query: React.MutableRefObject<undefined | string>,
  images: React.MutableRefObject<undefined | RaycastImage[]>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setImageView: React.Dispatch<React.SetStateAction<string>>,
  setThinking: React.Dispatch<React.SetStateAction<string>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  creativity: Creativity = Creativity.Medium,
  thinking: ThinkingEffort = false,
  keep_alive?: string,
): Promise<void> {
  setLoading(true);

  // Loading Images if required
  const imgs = await PromptTokenImageParser(prompt);
  if (imgs) {
    const i = imgs[1];
    setImageView("");
    i.forEach((i) => {
      setImageView((prevState) => prevState + i.html);
    });
    setImageView((prevState) => prevState + "\n");
    images.current = imgs[1];
  }

  // Loading query
  prompt = await PromptTokenParser(prompt);
  query.current = prompt;

  // Start Inference
  setAnswer("");
  setThinking("");
  await Inference(
    model,
    prompt,
    setLoading,
    setThinking,
    setAnswer,
    setAnswerMetadata,
    imgs && imgs[1] ? imgs[1].map((i) => i.base64) : undefined,
    creativity,
    thinking,
    keep_alive,
  );
}

/**
 * Run background inference with Ollama API.
 */
export async function RunBackgroundInference(
  model: Types.UiModel,
  prompt: string,
  creativity: Creativity = Creativity.Medium,
  thinking: ThinkingEffort = false,
  keep_alive?: string,
): Promise<string> {
  const pts = await PromptTokenParser(prompt);
  prompt = pts;

  const imgs = await PromptTokenImageParser(prompt);
  let base64Images: string[] | undefined = undefined;
  if (imgs) {
    base64Images = imgs[1].map((i) => i.base64);
  }

  if (model.server.customClient || isCustomServer(model.server.name)) {
    const client = model.server.customClient || (await getCustomClient(model.server.name, model.tag.name));
    if (!client) throw new Error(`Could not initialize client for ${model.server.name}`);
    return await client.chatNoStream({
      model: model.tag.name,
      messages: [
        {
          role: "user",
          content: prompt,
          images: base64Images ? base64Images.map((base64) => ({ path: "", html: "", base64 })) : undefined,
        },
      ],
      temperature: creativity,
    });
  }

  const body: OllamaApiGenerateRequestBody = {
    model: model.tag.name,
    prompt: prompt,
    images: base64Images,
    think: thinking,
    options: {
      temperature: creativity,
    },
  };
  if (keep_alive) body.keep_alive = keep_alive;

  if (!model.server.ollama) throw new Error("Ollama client unavailable");
  const res = await model.server.ollama.OllamaApiGenerateNoStream(body);
  return res.response;
}

/**
 * Handle no-view command execution (either background replacement or view launching).
 */
export async function handleNoViewCommand(
  command: CommandAnswer,
  promptValues?: Record<string, string>,
  customPrompt?: string,
): Promise<void> {
  const pref = getPreferenceValues<Preferences>();
  if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

  const defaultPrompt = customPrompt || COMMANDS_INFO[command]?.defaultPrompt || "";

  let action: "view" | "replace" = "view";
  let settings: SettingsCommandAnswer | undefined;
  try {
    settings = await GetSettingsCommandAnswer(command);
    if (settings.action === "replace") {
      action = "replace";
    }
  } catch {
    // Default to view
  }

  const prompt = settings?.prompt !== undefined ? settings.prompt : defaultPrompt;

  if (action === "replace") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running inference..." });
    try {
      let model;
      try {
        model = await GetModel(command);
      } catch (e) {
        const err = e as Error;
        if (err.message === "Settings for this Command unavailable") {
          await launchCommand({
            name: "cmd-answer",
            type: LaunchType.UserInitiated,
            context: {
              command,
              prompt,
              promptValues,
            },
          });
          await toast.hide();
          return;
        }
        throw e;
      }

      let promptToRun = prompt;
      if (promptValues) {
        for (const [key, value] of Object.entries(promptValues)) {
          const regex = new RegExp(`{[ ]*${key}[ ]*}`, "gi");
          promptToRun = promptToRun.replace(regex, value);
        }
      }

      const creativity = command === CommandAnswer.TWEET ? Creativity.High : Creativity.Low;
      const result = await RunBackgroundInference(model, promptToRun, creativity, model.thinking, model.keep_alive);

      await Clipboard.paste(result);
      await toast.hide();
      await showHUD("Text replaced successfully");
    } catch (e) {
      const err = e as Error;
      toast.style = Toast.Style.Failure;
      toast.title = "Error running command";
      toast.message = err.message || String(e);
    }
  } else {
    try {
      await launchCommand({
        name: "cmd-answer",
        type: LaunchType.UserInitiated,
        context: {
          command,
          prompt,
          promptValues,
        },
      });
    } catch (e) {
      const err = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Error launching view",
        message: err.message || String(e),
      });
    }
  }
}

/**
 * Convert session exchanges into chat.
 */
export async function convertExchangesToChat(
  model: Types.UiModel,
  exchanges: {
    query: string;
    answer: string;
    thinking: string;
    metadata?: OllamaApiGenerateResponse;
    images?: RaycastImage[];
  }[],
  thinkingEffort?: ThinkingEffort,
): Promise<void> {
  const isCustom = isCustomServer(model.server.name);
  const server = isCustom ? undefined : await GetOllamaServerByName(model.server.name);

  const messages: RaycastChatMessage[] = exchanges.map((ex) => ({
    messages: [
      {
        role: OllamaApiChatMessageRole.User,
        content: ex.query,
        images: ex.images ? ex.images.map((i) => i.base64) : undefined,
      },
      {
        role: OllamaApiChatMessageRole.Assistant,
        thinking: ex.thinking,
        content: ex.answer,
      },
    ],
    images: ex.images,
    ...ex.metadata,
    model: model.tag.name,
    created_at: ex.metadata?.created_at || new Date().toISOString(),
    done: ex.metadata?.done !== undefined ? ex.metadata.done : true,
  }));

  const chat: RaycastChat = {
    name: exchanges[0]?.query ? `${exchanges[0].query.substring(0, 25)}...` : "New Chat",
    models: {
      main: {
        server: server,
        server_name: model.server.name,
        tag: model.tag.name,
        keep_alive: model.keep_alive,
        thinking: thinkingEffort ? thinkingEffort : model.thinking,
      },
    },
    messages: messages,
  };
  await AddSettingsCommandChat(chat);
}
