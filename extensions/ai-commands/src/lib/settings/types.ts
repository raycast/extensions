import { OllamaServer, ThinkingEffort } from "../ollama/types";
import { ChatMessage } from "../inference/types";
import { RaycastImage } from "../types";

export interface SettingsModel {
  server?: OllamaServer;
  tag: string;
  thinking?: ThinkingEffort;
  keep_alive?: string;
}

export interface SettingsChatModel extends SettingsModel {
  server_name: string;
}

export interface SettingsModels {
  main: SettingsModel;
  embedding?: SettingsModel;
  vision?: SettingsModel;
}

export interface SettingsChatModels {
  main: SettingsChatModel;
  vision?: SettingsChatModel;
  tools?: SettingsChatModel;
  embedding?: SettingsChatModel;
}

export interface SettingsCommandAnswer {
  server: string;
  model: SettingsModels;
  prompt?: string;
  action?: "view" | "replace";
}

export interface RaycastChat {
  name: string;
  models: SettingsChatModels;
  messages: RaycastChatMessage[];
  mcp_server?: string[];
}

/** A persisted conversation turn, independent of its inference provider. */
export interface RaycastChatMessage {
  model?: string;
  created_at?: string;
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  images?: RaycastImage[];
  files?: string[];
  messages: ChatMessage[];
}

export interface CustomCommand {
  id: string;
  title: string;
  prompt: string;
  server: string;
  model: string;
  creativity?: number;
  thinking?: string;
  keep_alive?: string;
  action?: "view" | "replace";
  createdAt?: string;
  updatedAt?: string;
}
