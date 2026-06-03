import { showHUD } from "@raycast/api";
import { tmpdir } from "os";
import { join } from "path";

export const LAST_TRANSCRIPTION_FILE = join(tmpdir(), "voxtral_last.txt");
export const REFORMULATED_FILE = join(tmpdir(), "voxtral_reformulated.txt");

export interface Preferences {
  apiKey: string;
  reformulatePrompt: string;
}

export async function checkMistralResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error (${response.status}): ${errorText}`);
  }
}

export async function showErrorHUD(e: unknown): Promise<void> {
  const msg = e instanceof Error ? e.message : String(e);
  await showHUD(`Error: ${msg.slice(0, 80)}`);
}
