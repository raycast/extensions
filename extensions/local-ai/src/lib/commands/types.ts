import type { Creativity, Guardrails, UseCase } from "../fm/args";

export type OutputMode = "replace" | "window";

export interface AiCommand {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  output: OutputMode;
  model: string;
  creativity: Creativity;
  useCase: UseCase;
  guardrails: Guardrails;
  pinned: boolean;
  isStarter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommandStore {
  version: 1;
  commands: AiCommand[];
}

export interface CommandDefaults {
  model: string;
  creativity: Creativity;
}

export type CommandFields = Pick<
  AiCommand,
  "name" | "icon" | "prompt" | "output" | "model" | "creativity" | "useCase" | "guardrails"
>;

export const COMMAND_STORE_VERSION = 1;
export const COMMANDS_STORAGE_KEY = "commands";
export const COMMANDS_BACKUP_KEY = "commands.corrupt-backup";
export const DEFAULT_ICON = "Stars";
