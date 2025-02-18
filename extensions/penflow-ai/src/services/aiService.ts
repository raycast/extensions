import { AI } from "@raycast/api";
import { AIRequestOptions, Message, WritingStyle } from "../utils/types";
import { getWordCompletionPrompt, getTranslationPrompt } from "../utils/prompts";
import { handleError, debounce } from "../utils/helpers";
import { logger } from "../utils/logger";

// 默认模型配置，仅配置一次
const DEFAULT_MODEL = "google-gemini-2.0-flash";

function logAICall(type: string, input: string, messages: Message[], response?: string) {
  // 调试日志仅在开发环境下输出
  logger.debug(`${type}${input ? ` - ${input}` : ""}`);
  if (response) {
    logger.debug(`Response: ${response}`);
  }
}

export async function processWithModel(messages: Message[], _options?: AIRequestOptions): Promise<string> {
  try {
    // 仅保留记录 AI API 请求日志
    logAICall("Request", "", messages);

    const response = await AI.ask(messages[messages.length - 1].content, {
      model: DEFAULT_MODEL as unknown as AI.Model,
    });

    // 仅保留记录 AI API 返回日志
    logAICall("Response", "", messages, response.trim());
    return response.trim();
  } catch (error) {
    handleError(error, "AI processing");
    throw error;
  }
}

export async function getWordCompletions(input: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getWordCompletionPrompt(input, options?.style || WritingStyle.Professional);

    const response = await processWithModel(messages, options);

    // 修改为返回8个建议
    const completions = response
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 8); // 从之前的 5 改为 8

    return completions.length > 0 ? completions : [response];
  } catch (error) {
    handleError(error, "word completion");
    throw error;
  }
}

export async function translateMixedText(text: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getTranslationPrompt(text);

    const response = await processWithModel(messages, options);

    // 解析各个变体
    const results = response
      .split("\n")
      .filter((line) => line.includes(": "))
      .map((line) => line.split(": ")[1].trim());

    return results.length >= 4 ? results : [response];
  } catch (error) {
    handleError(error, "translation");
    throw error;
  }
}

export function getCurrentAISettings() {
  return {
    model: DEFAULT_MODEL,
    modelName: "Google Gemini 2.0 Flash",
    style: "Professional",
  };
}

// 可选：若需要对输入做防抖处理，可以导出防抖版本
export const debouncedProcessWithModel = debounce(processWithModel, 1000);
