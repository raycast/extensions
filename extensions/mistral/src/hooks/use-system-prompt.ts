import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

const storageKey = "mistral-system-prompt";

export function useSystemPrompt() {
  return useLocalStorage<string>(storageKey);
}

export async function getSystemPrompt(): Promise<string | undefined> {
  return await LocalStorage.getItem(storageKey);
}

export async function setSystemPrompt(prompt: string) {
  await LocalStorage.setItem(storageKey, prompt);
}
