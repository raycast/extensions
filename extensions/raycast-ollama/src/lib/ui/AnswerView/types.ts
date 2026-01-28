import { Ollama } from "../../ollama/ollama";
import { OllamaApiTagsResponseModel } from "../../ollama/types";

export interface UiServer {
  name: string;
  ollama: Ollama;
}

export interface UiModel {
  server: UiServer;
  tag: OllamaApiTagsResponseModel;
  keep_alive?: string;
}
