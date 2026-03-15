// --- JWT Helpers ---

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
  return JSON.parse(payload);
}

export function extractAccountId(accessToken: string): string | undefined {
  try {
    const payload = decodeJwtPayload(accessToken);

    // Preferred: nested object at https://api.openai.com/auth
    const authObj = payload["https://api.openai.com/auth"];
    if (authObj && typeof authObj === "object" && !Array.isArray(authObj)) {
      const id = (authObj as Record<string, unknown>)["chatgpt_account_id"];
      if (typeof id === "string" && id.trim()) return id.trim();
    }

    // Legacy flat claim
    const legacy = payload["https://api.openai.com/auth.chatgpt_account_id"];
    if (typeof legacy === "string" && legacy.trim()) return legacy.trim();

    return undefined;
  } catch {
    return undefined;
  }
}

// --- SSE Parsing ---

export function parseSSEStream(body: string): string {
  let result = "";

  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") break;
    try {
      const event = JSON.parse(data);
      if (event.type === "response.output_text.delta" && event.delta) {
        result += event.delta;
      }
    } catch {
      // skip non-JSON lines
    }
  }

  return result;
}

// --- Unified Grammar Check ---

import { codexGrammarCheck } from "./providers/codex";
import { geminiGrammarCheck } from "./providers/gemini";

export function isGeminiModel(model: string): boolean {
  return model.startsWith("gemini");
}

export interface CheckGrammarOptions {
  text: string;
  token: string;
  geminiApiKey?: string;
  model: string;
  prompt: string;
}

export async function checkGrammar(options: CheckGrammarOptions): Promise<string> {
  if (isGeminiModel(options.model)) {
    if (!options.geminiApiKey) {
      throw new Error("Gemini API key required. Set it in Settings (Cmd+Shift+,).");
    }
    return geminiGrammarCheck({
      text: options.text,
      apiKey: options.geminiApiKey,
      model: options.model,
      prompt: options.prompt,
    });
  }
  return codexGrammarCheck(options);
}
