import { Ollama } from "../../ollama/ollama";
import { OllamaApiPsModel } from "../../ollama/types";

export interface UiServer {
  name: string;
  ollama: Ollama;
}

export interface UiModel {
  server: UiServer;
  detail: OllamaApiPsModel;
}
