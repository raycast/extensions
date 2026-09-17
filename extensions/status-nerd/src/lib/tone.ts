import { LocalStorage } from "@raycast/api";

const TONE_KEY = "ai-tone";
const ONBOARDED_KEY = "onboarded-v1";

/** User-defined tone/style guidance for the AI prompt ("" = built-in default). */
export async function getTone(): Promise<string> {
  return (await LocalStorage.getItem<string>(TONE_KEY)) ?? "";
}

/** Save the tone and mark onboarding as done. */
export async function setTone(tone: string): Promise<void> {
  await LocalStorage.setItem(TONE_KEY, tone.trim());
  await LocalStorage.setItem(ONBOARDED_KEY, "1");
}

export async function isOnboarded(): Promise<boolean> {
  return (await LocalStorage.getItem<string>(ONBOARDED_KEY)) === "1";
}
