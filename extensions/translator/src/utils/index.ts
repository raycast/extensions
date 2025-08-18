import { LANGUAGES, SUPPORT_PROVIDERS } from "../constant";
import { TranslationResult, OllamaResponseData } from "../types";
import { createHash } from "crypto";
import logger from "./logger";
import { showFailureToast } from "@raycast/utils";

function buildPrompt(text: string, targetLangName: string): string {
  return `You are a professional translator.  
Given the following inputs:  
- text: ${text} 
- targetLanguage: ${targetLangName}  

Translate the text into the targetLanguage and return ONLY the following JSON block, without any additional commentary or formatting:

{
  "original": "<original_text>",
  "translation": "<translated_text>"
}
`;
}

function shortHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 8);
}

export async function translateByAI({
  text,
  targetLanguage,
  server,
  modelName,
}: {
  text: string;
  targetLanguage: string;
  server: string;
  modelName: string;
  apiKey?: string;
}): Promise<TranslationResult> {
  if (!text?.trim()) {
    throw new Error("Text is empty");
  }
  const targetLangName = LANGUAGES.find((l) => l.code === targetLanguage)?.name || targetLanguage;
  const prompt = buildPrompt(text, targetLangName);

  const provider = SUPPORT_PROVIDERS.find((p) => p.name.toLowerCase() === server.toLowerCase());

  if (!provider?.url) {
    throw new Error(`Provider ${server} not found`);
  }

  const start = Date.now();
  const reqId = shortHash(text); // 一个短哈希，便于日志追踪

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, prompt, stream: false }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as OllamaResponseData;
    const duration = Date.now() - start;
    logger.write(
      JSON.stringify({
        type: "log",
        ts: new Date().toLocaleTimeString(),
        reqId,
        duration,
        text,
        targetLanguage,
        server,
        modelName,
        data,
      }),
    );
    // 清理HTML标签、换行符和多余空格
    const cleaned = data.response
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .trim();
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) {
      throw new Error("No JSON block found");
    }
    const result = JSON.parse(match[0] || "{}") as TranslationResult;
    if (!result?.translation || !result?.original) {
      throw new Error("Invalid JSON structure");
    }
    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.write(
        JSON.stringify({
          type: "error",
          ts: new Date().toLocaleTimeString(),
          reqId,
          error: error.message,
          stack: error.stack,
          text,
          targetLanguage,
          server,
          modelName,
        }),
      );
      showFailureToast(error);
    }
    throw error;
  }
}
