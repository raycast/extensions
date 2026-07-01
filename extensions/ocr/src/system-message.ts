import { LocalStorage } from "@raycast/api";

const SYSTEM_MESSAGE_STORAGE_KEY = "ocr-system-message";

export const DEFAULT_SYSTEM_MESSAGE =
  "You are an OCR assistant. Transcribe all readable text from the image into clean Markdown that mirrors the original layout. Map visual structure to Markdown: headings to # / ## / ### by their relative size and emphasis, bulleted lists to '- ', numbered lists to '1.' '2.' preserving the original numbers, and nested items via indentation. Reproduce inline styling using **bold**, *italic*, and ~~strikethrough~~. Preserve line breaks, blank lines between paragraphs, and overall reading order. Transcribe text exactly as written without translating, correcting, summarizing, or adding content. Output only the Markdown transcription with no commentary, no explanation, and no surrounding code fences. If no readable text is present, return an empty response.";

export async function getConfiguredSystemMessage(): Promise<string> {
  const storedSystemMessage = await LocalStorage.getItem<string>(SYSTEM_MESSAGE_STORAGE_KEY);
  const normalizedStoredSystemMessage = storedSystemMessage?.trim();

  if (normalizedStoredSystemMessage) {
    return normalizedStoredSystemMessage;
  }

  return DEFAULT_SYSTEM_MESSAGE;
}

export async function saveConfiguredSystemMessage(systemMessage: string): Promise<void> {
  await LocalStorage.setItem(SYSTEM_MESSAGE_STORAGE_KEY, systemMessage);
}

export async function resetConfiguredSystemMessage(): Promise<void> {
  await LocalStorage.removeItem(SYSTEM_MESSAGE_STORAGE_KEY);
}
