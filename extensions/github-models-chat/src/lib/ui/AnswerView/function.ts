import * as Types from "./types";
import * as React from "react";
// import { Ollama } from "../../ollama/ollama";
import { OllamaApiGenerateRequestBody, OllamaApiGenerateResponse } from "../../ollama/types";
import { CommandAnswer } from "../../settings/enum";
import { AddSettingsCommandChat, GetOllamaServerByName, GetSettingsCommandAnswer } from "../../settings/settings";
import { launchCommand, LaunchType, showToast, Toast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { GetAvailableModel, PromptTokenImageParser, PromptTokenParser } from "../function";
import { Creativity } from "../../enum";
import { RaycastChat, SettingsCommandAnswer } from "../../settings/types";
import { OllamaApiChatMessageRole } from "../../ollama/enum";
import { RaycastImage } from "../../types";
import { chatCompletion, GitHubChatMessage, GitHubContentPart, listCatalog } from "../../github/api";
import { Preferences } from "../../types";

// Helper to infer MIME type from file path (fallback to image/jpeg)
function inferMime(path?: string): string {
  if (!path) return "image/jpeg";
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

/**
 * Get Types.UiModel with fallback to GitHub default when settings are unavailable.
 */
export async function GetModel(command?: CommandAnswer, server?: string, model?: string): Promise<Types.UiModel> {
  let settings: SettingsCommandAnswer | undefined;
  let resolvedServer = server;
  let resolvedModel = model;
  if (command) {
    try {
      settings = await GetSettingsCommandAnswer(command);
      resolvedServer = settings.server;
      resolvedModel = settings.model.main.tag;
    } catch {
      // Fallback: GitHub default
      resolvedServer = "GitHub";
      const prefs = getPreferenceValues<Preferences>();
      const cached = await LocalStorage.getItem<string>("github_default_model");
      resolvedModel = cached || prefs.defaultModel || "openai/gpt-4.1";
    }
  }
  if (!resolvedServer || !resolvedModel) throw new Error("server and model need to be defined");

  // Build a minimal UiModel using available models list
  const s = await GetOllamaServerByName(resolvedServer);
  const available = await GetAvailableModel(resolvedServer);
  const match = available.find((m) => m.name === resolvedModel);
  if (!match) throw new Error("Model unavailable on given server");
  return {
    server: {
      name: resolvedServer,
      // placeholder; AnswerView inference uses GitHub chat client instead
      ollama: undefined as any,
    },
    tag: match,
    keep_alive: settings?.model.main.keep_alive,
  };
}

/**
 * Convert answer into chat for continue conversation on "Chat with Ollama" command.
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
 * Inference using GitHub Models chat/completions (non-streaming), with optional images via data URLs.
 */
async function Inference(
  model: Types.UiModel,
  prompt: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setAnswer: React.Dispatch<React.SetStateAction<string>>,
  setAnswerMetadata: React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>,
  images: RaycastImage[] | undefined = undefined,
  creativity: Creativity = Creativity.Medium,
  keep_alive?: string
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });

  try {
    const prefs = getPreferenceValues<Preferences>();
    const token = prefs.githubToken || "";

    let content: GitHubContentPart[] | string = prompt;
    if (images && images.length > 0) {
      const parts: GitHubContentPart[] = [{ type: "text", text: prompt }];
      for (const img of images) {
        const mime = inferMime(img.path);
        parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${img.base64}` } });
      }
      content = parts;
    }

    const messages: GitHubChatMessage[] = [
      {
        role: "user",
        content,
      },
    ];

    const resp = await chatCompletion(token, model.tag.name, messages);
    const answer = resp.choices?.[0]?.message?.content || "";
    setAnswer(answer);
    await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
  } catch (err: any) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: String(err?.message || err) });
  } finally {
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
    // Important: use the prompt with {image} removed
    prompt = imgs[0];
  }

  // Loading query
  prompt = await PromptTokenParser(prompt);
  query.current = prompt;

  // If images are included, prefer a vision-capable model (from catalog)
  let modelToUse = model;
  if (images.current && images.current.length > 0) {
    try {
      const prefs = getPreferenceValues<Preferences>();
      const token = prefs.githubToken || "";
      const catalog = await listCatalog(token);
      const vision = catalog.find((m) => m.supported_input_modalities?.includes("image"));
      if (vision && vision.id && vision.id !== model.tag.name) {
        modelToUse = { ...model, tag: { ...model.tag, name: vision.id } } as any;
      }
    } catch {
      // ignore; fallback to current model
    }
  }

  // Start Inference (GitHub Models)
  setAnswer("");
  await Inference(modelToUse, prompt, setLoading, setAnswer, setAnswerMetadata, images.current, creativity, keep_alive);
}
