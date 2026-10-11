import { OllamaManager } from "../../ollama/ollama";
import { OllamaModel, OllamaModelInfo, OllamaRunningModel } from "../../ollama/types";

export interface UiServer {
  name: string;
  ollama?: OllamaManager;
  isCustom?: boolean;
}

export interface UiModel {
  server: UiServer;
  detail: OllamaModel;
  show: OllamaModelInfo;
  ps?: OllamaRunningModel;
}

export interface UiModelDownload {
  server: string;
  name: string;
  download: number;
}
