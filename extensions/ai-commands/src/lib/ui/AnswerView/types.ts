import { Ollama } from "../../ollama/ollama";
import { OllamaApiTagsResponseModel, ThinkingEffort } from "../../ollama/types";
import { OpenAiClient } from "../../providers/openai-client";

export type UiModelTag = OllamaApiTagsResponseModel;

export interface UiServer {
  name: string;
  ollama?: Ollama;
  customClient?: OpenAiClient;
}

export interface UiModel {
  server: UiServer;
  tag: UiModelTag;
  thinking?: ThinkingEffort;
  keep_alive?: string;
  prompt?: string;
  action?: "view" | "replace";
}
