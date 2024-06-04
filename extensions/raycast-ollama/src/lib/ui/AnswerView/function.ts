import * as Types from "./types";
import * as React from "react";
import { Ollama } from "../../ollama/ollama";
import { OllamaApiGenerateRequestBody, OllamaApiGenerateResponse } from "../../ollama/types";
import { CommandAnswer } from "../../settings/enum";
import { GetOllamaServerByName, GetSettingsCommandAnswer } from "../../settings/settings";
import { showToast, Toast } from "@raycast/api";
import { GetAvailableModel, PromptTokenImageParser, PromptTokenParser } from "../function";
import { Creativity } from "../../enum";
import { SettingsCommandAnswer } from "../../settings/types";

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
  } else if (!server || !model) throw "server and model need to be defined";
  const s = await GetOllamaServerByName(server);
  const m = (await GetAvailableModel(server)).filter((m) => m.name === model);
  if (m.length < 1) throw "Model unavailable on given server";
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
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setImageView: React.Dispatch<React.SetStateAction<string>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  creativity: Creativity = Creativity.Medium,
  keep_alive?: string
): Promise<void> {
  setLoading(true);

  // Loading Images if required
  const images = await PromptTokenImageParser(prompt);
  if (images) {
    const i = images[1];
    setImageView("");
    i.forEach((i) => {
      setImageView((prevState) => prevState + i.html);
    });
    setImageView((prevState) => prevState + "\n");
  }

  // Loading query
  prompt = await PromptTokenParser(prompt);

  // Start Inference
  setAnswer("");
  await Inference(
    model,
    prompt,
    setLoading,
    setAnswer,
    setAnswerMetadata,
    images && images[1] ? images[1].map((i) => i.base64) : undefined,
    creativity,
    keep_alive
  );
}
