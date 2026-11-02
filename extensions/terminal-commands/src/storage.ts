import { LocalStorage } from "@raycast/api";

export interface SavedCommand {
  id: string;
  name: string;
  command: string;
}

export const STORAGE_KEY = "commands";

export const DEFAULT_COMMANDS: SavedCommand[] = [{ id: "ping-8-8-8-8", name: "Ping 8.8.8.8", command: "ping 8.8.8.8" }];

export async function getSavedCommands(): Promise<SavedCommand[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_COMMANDS;
}
