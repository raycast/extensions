import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { ChatStore } from "./chats";

export function getChatStore() {
  return new ChatStore(join(environment.supportPath, "chats"));
}

/** Temporary transcripts and images saved from the clipboard. Old files here are removed. */
export function getWorkDirectory() {
  return join(environment.supportPath, "tmp");
}

export function getDefaultInstructions(): string {
  return getPreferenceValues<ExtensionPreferences>().chatInstructions?.trim() ?? "";
}
