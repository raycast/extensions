import { OllamaApiChatMessage, OllamaApiGenerateStats, OllamaServer } from "../ollama/types";
import { RaycastImage } from "../types";

export interface SettingsModel {
  server: OllamaServer;
  tag: string;
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
  embedding?: SettingsChatModel;
  vision?: SettingsChatModel;
}

export interface SettingsCommandAnswer {
  server: string;
  model: SettingsModels;
}

export interface LegacyRaycastChatMessage extends OllamaApiGenerateStats {
  tags?: string[];
  sources?: string[];
  images?: RaycastImage[];

  messages: OllamaApiChatMessage[];
}

export interface RaycastChat {
  name: string;
  models: SettingsChatModels;
  messages: RaycastChatMessage[];
}

export interface RaycastChatMessage extends OllamaApiGenerateStats {
  images?: RaycastImage[];
  files?: string[];
  messages: OllamaApiChatMessage[];
}
