import { showHUD } from "@raycast/api";
import { tmpdir } from "os";
import { join } from "path";

export const LAST_TRANSCRIPTION_FILE = join(tmpdir(), "voxtral_last.txt");
export const REFORMULATED_FILE = join(tmpdir(), "voxtral_reformulated.txt");

export interface Preferences {
  apiKey: string;
  autoReformulate: boolean;
  reformulatePrompt: string;
}

export const DEFAULT_SYSTEM_PROMPT =
  "You are a text reformulator. The user gives you a raw speech-to-text transcription. It may contain filler words, repetitions, grammatical errors, or unclear phrasing. Rewrite it as a clear, well-structured text. Be concise and direct. Preserve the original meaning and intent. Only output the reformulated text, nothing else. Keep the same language as the input.";

export async function callReformulate(
  text: string,
  apiKey: string,
  systemPrompt: string,
): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  await checkMistralResponse(response);
  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return result.choices[0].message.content;
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
