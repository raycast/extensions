import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { addTranslationToHistory } from "./history";
import type { TranslationTarget } from "./openai-compatible";

const CLIPBOARD_UPDATE_DELAY_MS = 100;

interface TranslationDeliveryInput {
  sourceText: string;
  translatedText: string;
  target: TranslationTarget;
  model: string;
}

export class TranslationDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationDeliveryError";
  }
}

export async function deliverTranslation({
  sourceText,
  translatedText,
  target,
  model,
}: TranslationDeliveryInput): Promise<void> {
  const historySavedPromise = addTranslationToHistory(sourceText, translatedText, target, model).catch((error) => {
    console.error("Failed to save translation history", error);
  });

  try {
    await Clipboard.copy(translatedText);
  } catch (error) {
    console.error("Failed to copy translation", error);
    await historySavedPromise;
    throw new TranslationDeliveryError("The translation was completed, but Raycast could not copy it.");
  }

  await delay(CLIPBOARD_UPDATE_DELAY_MS);

  try {
    await Clipboard.paste(translatedText);
    await showResultHUD("✅ Text copied and automatically inserted");
  } catch (error) {
    console.error("Failed to paste translation", error);
    await showResultHUD("📋 Text copied to clipboard (paste with Cmd+V)");
  }

  await historySavedPromise;
  await popToRoot();
}

async function showResultHUD(message: string): Promise<void> {
  try {
    await showHUD(message);
  } catch (error) {
    console.error("Failed to show translation result HUD", error);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
