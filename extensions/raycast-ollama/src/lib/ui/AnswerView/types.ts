import { Ollama } from "../../ollama/ollama";
import { OllamaApiTagsResponseModel, ThinkingEffort } from "../../ollama/types";

export interface UiServer {
  name: string;
  ollama: Ollama;
}

export interface UiModel {
  server: UiServer;
  tag: OllamaApiTagsResponseModel;
  thinking?: ThinkingEffort;
  keep_alive?: string;
}
