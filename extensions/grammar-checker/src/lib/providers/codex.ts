import { log } from "../log";
import { extractAccountId, parseSSEStream } from "../api";
import { CHATGPT_API_URL } from "./openai-constants";

export interface CodexOptions {
  text: string;
  token: string;
  model: string;
  prompt: string;
}

export async function codexGrammarCheck(options: CodexOptions): Promise<string> {
  const { text, token, model, prompt } = options;
  const accountId = extractAccountId(token);
  log(`Calling ChatGPT Codex API... model: ${model}, accountId: ${accountId ?? "not found"}`);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (accountId) {
    headers["ChatGPT-Account-ID"] = accountId;
  }

  const response = await fetch(CHATGPT_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      instructions: prompt,
      input: [{ role: "user", content: text }],
      store: false,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    log(`API error (${response.status}): ${err}`);
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const body = await response.text();
  const result = parseSSEStream(body);

  log(`Stream complete, result length: ${result.length}`);
  if (!result) throw new Error("Empty response from OpenAI");

  return result;
}
