import { ThinkingEffort } from "../../ollama/types";

export interface UiModelTag {
  name: string;
  context?: number;
}

export interface UiServer {
  name: string;
}

export interface UiModel {
  server: UiServer;
  tag: UiModelTag;
  thinking?: ThinkingEffort;
  keep_alive?: string;
  prompt?: string;
  action?: "view" | "replace";
}
