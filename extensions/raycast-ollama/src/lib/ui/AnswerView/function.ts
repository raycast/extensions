import * as Types from "./types";
import * as React from "react";
import { Ollama } from "../../ollama/ollama";
import { OllamaApiGenerateRequestBody, OllamaApiGenerateResponse } from "../../ollama/types";
import { CommandAnswer } from "../../settings/enum";
import { AddSettingsCommandChat, GetOllamaServerByName, GetSettingsCommandAnswer } from "../../settings/settings";
import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { GetAvailableModel, PromptTokenImageParser, PromptTokenParser } from "../function";
import { Creativity } from "../../enum";
import { RaycastChat, SettingsCommandAnswer } from "../../settings/types";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { RaycastImage } from "../../types";

/**
 * Get Types.UiModel.
 * @param command - Command Type.
 * @param server - Ollama Server Name.
 * @param model - Ollama Model Tag Name.
 * @param Types.UiModel.
 */
export async function GetModel(command?: CommandAnswer, server?: string, model?: string): Promise<Types.UiModel> {
  let settings: SettingsCommandAnswer | undefined;
  if (command) {
    settings = await GetSettingsCommandAnswer(command);
    server = settings.server;
    model = settings.model.main.tag;
  } else if (!server || !model) throw new Error("server and model need to be defined");
  const s = await GetOllamaServerByName(server);
  const m = (await GetAvailableModel(server)).filter((m) => m.name === model);
  if (m.length < 1) throw new Error("Model unavailable on given server");
  return {
    server: {
      name: server,
      ollama: new Ollama(s),
    },
    tag: m[0],
    keep_alive: settings?.model.main.keep_alive,
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
  answer: string,
  answerMeta: OllamaApiGenerateResponse,
  openCommand = true
): Promise<void> {
  const server = await GetOllamaServerByName(model.server.name);
  const chat: RaycastChat = {
    name: query ? `${query.substring(0, 25)}...` : "New Chat",
    models: {
      main: {
        server: server,
        server_name: model.server.name,
        tag: model.tag.name,
        keep_alive: model.keep_alive,
      },
    },
    messages: [
      {
        messages: [
          {
            role: OllamaApiChatMessageRole.USER,
            content: query ? query : "",
            images: images ? images.map((i) => i.base64) : undefined,
          },
          {
            role: OllamaApiChatMessageRole.ASSISTANT,
            content: answer,
          },
        ],
        images: images,
        ...answerMeta,
      },
    ],
  };
  await AddSettingsCommandChat(chat);
  openCommand && (await launchCommand({ name: "ollama-chat", type: LaunchType.UserInitiated }));
}

/**
 * Start Inference with Ollama API.
 */
async function Inference(
  model: Types.UiModel,
  prompt: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  images: string[] | undefined = undefined,
  creativity: Creativity = Creativity.Medium,
  keep_alive?: string
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });
  const body: OllamaApiGenerateRequestBody = {
    model: model.tag.name,
    prompt: prompt,
    images: images,
    options: {
      temperature: creativity,
    },
  };
  if (keep_alive) body.keep_alive = keep_alive;
  model.server.ollama
    .OllamaApiGenerate(body)
    .then(async (emiter) => {
      emiter.on("data", (data) => {
        setAnswer((prevState) => prevState + data);
      });

      emiter.on("done", async (data) => {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setAnswerMetadata(data);
        setLoading(false);
      });
    })
    .catch(async (err) => {
      await showToast({ style: Toast.Style.Failure, title: err });
      setLoading(false);
    });
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
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  creativity: Creativity = Creativity.Medium,
  keep_alive?: string
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
  await Inference(
    model,
    prompt,
    setLoading,
    setAnswer,
    setAnswerMetadata,
    imgs && imgs[1] ? imgs[1].map((i) => i.base64) : undefined,
    creativity,
    keep_alive
  );
}
