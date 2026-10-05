import * as Types from "./types";
import * as React from "react";
import { ThinkingEffort } from "../../ollama/types";
import { CommandAnswer } from "../../settings/enum";
import { COMMANDS_INFO } from "../../settings/defaultPrompts";
import { AddSettingsCommandChat, GetSettingsCommandAnswer } from "../../settings/settings";
import { Clipboard, getPreferenceValues, launchCommand, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { GetAvailableModel, PromptTokenImageParser, PromptTokenParser, GetPromptTokenSelectionText } from "../function";
export { GetPromptTokenSelectionText };
import { Creativity } from "../../enum";
import { RaycastChat, RaycastChatMessage, SettingsCommandAnswer } from "../../settings/types";
import { RaycastImage } from "../../types";
import { MessageRole } from "../../inference/types";
import { formatCustomServerName, getCustomModel, getCustomProvider } from "../../providers/unified-provider";
import { createLanguageModel, reasoningOptions, toModelMessages } from "../../providers/ai-sdk";
import { generateText, streamText } from "ai";

export interface AnswerInferenceMetadata {
  model: string;
  created_at: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

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
    settings = await GetSettingsCommandAnswer(command);
    server = settings.server;
    model = settings.model.main.tag;
  } else if (!server || !model) throw new Error("server and model need to be defined");

  const customProvider = await getCustomProvider(server);
  if (customProvider) {
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

    return {
      server: {
        name: formatCustomServerName(customProvider),
      },
      tag: { name: customModel.id, context: customModel.context },
      thinking: settings?.model.main.thinking,
      keep_alive: settings?.model.main.keep_alive,
      prompt: settings?.prompt,
      action: settings?.action,
    };
  }

  const m = (await GetAvailableModel(server)).filter((m) => m.name === model);
  if (m.length < 1) throw new Error("Model unavailable on given server");
  return {
    server: {
      name: server,
    },
    tag: m[0],
    thinking: settings?.model.main.thinking,
    keep_alive: settings?.model.main.keep_alive,
    prompt: settings?.prompt,
    action: settings?.action,
  };
}

/**
 * Convert an answer into a chat.
 * @param model
 * @param query
 * @param answer
 * @param answerMeta
 * @param openCommand? - `false` to avoid opening the chat command.
 */
export async function convertAnswerToChat(
  model: Types.UiModel,
  query: string | undefined,
  images: RaycastImage[] | undefined,
  thinking: string | undefined,
  answer: string,
  answerMeta: AnswerInferenceMetadata,
  openCommand = true,
  thinkingEffort?: ThinkingEffort,
): Promise<void> {
  const chat: RaycastChat = {
    name: query ? `${query.substring(0, 25)}...` : "New Chat",
    models: {
      main: {
        server: undefined,
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
            role: MessageRole.USER,
            content: query ? query : "",
            images,
          },
          {
            role: MessageRole.ASSISTANT,
            reasoning: thinking,
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
 * Start inference through the configured OpenAI-compatible provider.
 */
async function Inference(
  model: Types.UiModel,
  prompt: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setThinking: React.Dispatch<React.SetStateAction<string>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<AnswerInferenceMetadata>>,
  images: string[] | undefined = undefined,
  creativity: Creativity = Creativity.Medium,
  thinking: ThinkingEffort = false,
  keepAlive?: string,
): Promise<void> {
  void keepAlive;
  let thinkingStarted = false;
  let responseStarted = false;

  await showToast({ style: Toast.Style.Animated, title: "💾 Loading..." });
  try {
    const provider = await getCustomProvider(model.server.name);
    if (!provider) throw new Error(`Provider '${model.server.name}' not found`);
    const result = streamText({
      model: createLanguageModel(provider)(model.tag.name),
      messages: toModelMessages([
        {
          role: MessageRole.USER,
          content: prompt,
          images: images ? images.map((base64) => ({ path: "", html: "", base64 })) : undefined,
        },
      ]) as never,
      temperature: creativity,
      providerOptions: reasoningOptions(provider, thinking === false ? "none" : thinking),
    });
    for await (const part of result.fullStream) {
      if (part.type === "reasoning-delta") {
        if (!thinkingStarted) await showToast({ style: Toast.Style.Animated, title: "🤔 Thinking..." });
        thinkingStarted = true;
        setThinking((current) => current + part.text);
      }
      if (part.type === "text-delta") {
        if (!responseStarted) await showToast({ style: Toast.Style.Animated, title: "✍️ Typing..." });
        responseStarted = true;
        setAnswer((current) => current + part.text);
      }
    }
    const usage = await result.usage;
    setAnswerMetadata({
      model: model.tag.name,
      created_at: new Date().toISOString(),
      done: true,
      prompt_eval_count: usage.inputTokens,
      eval_count: usage.outputTokens,
    });
    await showToast({ style: Toast.Style.Success, title: "👍 Done." });
    setLoading(false);
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
  setAnswerMetadata: React.Dispatch<React.SetStateAction<AnswerInferenceMetadata>>,
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
 * Run background inference through the configured provider.
 */
export async function RunBackgroundInference(
  model: Types.UiModel,
  prompt: string,
  creativity: Creativity = Creativity.Medium,
  thinking: ThinkingEffort = false,
  keepAlive?: string,
): Promise<string> {
  void keepAlive;
  const pts = await PromptTokenParser(prompt);
  prompt = pts;

  const imgs = await PromptTokenImageParser(prompt);
  let base64Images: string[] | undefined = undefined;
  if (imgs) {
    base64Images = imgs[1].map((i) => i.base64);
  }

  const provider = await getCustomProvider(model.server.name);
  if (!provider) throw new Error(`Provider '${model.server.name}' not found`);
  const result = await generateText({
    model: createLanguageModel(provider)(model.tag.name),
    messages: toModelMessages([
      {
        role: MessageRole.USER,
        content: prompt,
        images: base64Images ? base64Images.map((base64) => ({ path: "", html: "", base64 })) : undefined,
      },
    ]) as never,
    temperature: creativity,
    providerOptions: reasoningOptions(provider, thinking === false ? "none" : thinking),
  });
  return result.text;
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
  if (pref.certificateValidation === false) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

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
    metadata?: AnswerInferenceMetadata;
    images?: RaycastImage[];
  }[],
  thinkingEffort?: ThinkingEffort,
): Promise<void> {
  const messages: RaycastChatMessage[] = exchanges.map((ex) => ({
    messages: [
      {
        role: MessageRole.USER,
        content: ex.query,
        images: ex.images,
      },
      {
        role: MessageRole.ASSISTANT,
        reasoning: ex.thinking,
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
        server: undefined,
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
