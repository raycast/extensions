import { LocalStorage } from "@raycast/api";

export interface TelegramConfig {
  botToken: string;
}

export async function saveBotToken(token: string): Promise<void> {
  await LocalStorage.setItem("telegram-bot-token", token);
}

export async function getBotToken(): Promise<string | undefined> {
  return await LocalStorage.getItem("telegram-bot-token");
}

export async function clearBotToken(): Promise<void> {
  await LocalStorage.removeItem("telegram-bot-token");
}
