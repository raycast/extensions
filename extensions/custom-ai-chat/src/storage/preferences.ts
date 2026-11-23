import { LocalStorage } from "@raycast/api";

const SELECTED_MODEL_KEY = "byoai.selectedModelKey";
const SELECTED_CONVERSATION_KEY = "byoai.selectedConversationId";

export async function loadSelectedModelKey(): Promise<string | null> {
  return readString(SELECTED_MODEL_KEY);
}

export async function saveSelectedModelKey(value: string | null): Promise<void> {
  await writeOptionalString(SELECTED_MODEL_KEY, value);
}

export async function loadSelectedConversationId(): Promise<string | null> {
  return readString(SELECTED_CONVERSATION_KEY);
}

export async function saveSelectedConversationId(value: string | null): Promise<void> {
  await writeOptionalString(SELECTED_CONVERSATION_KEY, value);
}

async function readString(key: string): Promise<string | null> {
  try {
    const value = await LocalStorage.getItem<string>(key);
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function writeOptionalString(key: string, value: string | null): Promise<void> {
  try {
    if (value) {
      await LocalStorage.setItem(key, value);
    } else {
      await LocalStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}
