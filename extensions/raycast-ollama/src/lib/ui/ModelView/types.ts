import { Ollama } from "../../ollama/ollama";
import { OllamaApiShowModelfile, OllamaApiShowResponse, OllamaApiTagsResponseModel } from "../../ollama/types";

export interface UiServer {
  name: string;
  ollama: Ollama;
}

export interface UiModel {
  server: UiServer;
  detail: OllamaApiTagsResponseModel;
  show: OllamaApiShowResponse;
  modelfile: OllamaApiShowModelfile;
}

export interface UiModelDownload {
  server: string;
  name: string;
  download: number;
}
