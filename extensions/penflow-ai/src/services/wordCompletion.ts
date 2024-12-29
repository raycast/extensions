import { getWordCompletions, translateMixedText, processWithModel } from "./ai";
import { AIRequestOptions, Suggestion } from "../utils/types";
import { AI } from "@raycast/api";
import { getPolishPrompt } from "../utils/prompts";

// 辅助函数
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

function getLastEnglishSegment(text: string): string {
  const matches = text.match(/[a-zA-Z]+$/);
  return matches ? matches[0] : "";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function needsCompletion(text: string): boolean {
  const lastSegment = getLastEnglishSegment(text);
  return lastSegment.length >= 2;
}

function isCompleteSentence(text: string): boolean {
  // 检查是否是一个完整的句子（至少包含两个单词且以标点符号结尾）
  const words = text.trim().split(/\s+/);
  return words.length >= 2 && /[.!?]$/.test(text.trim());
}

// 主要的输入处理函数
export async function processInput(
  input: string,
  options?: AIRequestOptions
): Promise<Suggestion[]> {
  console.log('processInput - received input:', input);

  if (!input.trim() || input.length > 1000) {
    console.log('processInput - empty input or too long, returning empty array');
    return [];
  }

  const aiOptions = {
    ...options,
    creativity: containsChinese(input) ? "none" : ("medium" as AI.Creativity),
  };

  try {
    // 如果包含中文，返回翻译和润色结果
    if (containsChinese(input)) {
      console.log('processInput - Chinese text detected, getting translations');
      const translatedTexts = await translateMixedText(input, aiOptions);
      console.log('processInput - received translations:', translatedTexts);
      const results = translatedTexts.map(text => ({
        text: text.toString(),
        type: "translation" as const
      }));
      console.log('processInput - returning translation results:', JSON.stringify(results, null, 2));
      return results;
    }

    const totalWords = countWords(input);
    const lastSegment = getLastEnglishSegment(input);
    const suggestions: Suggestion[] = [];

    // 如果最后一个词不完整且总词数<=2，仅返回补全建议
    if (needsCompletion(input) && totalWords <= 2) {
      console.log('processInput - getting word completions for:', lastSegment);
      const completions = await getWordCompletions(lastSegment, aiOptions);
      console.log('processInput - received completions:', completions);
      const results = completions.slice(0, 5).map(text => ({
        text: text.toString(),
        type: "completion" as const
      }));
      console.log('processInput - returning completion results:', JSON.stringify(results, null, 2));
      return results;
    }

    // 其他情况，同时返回补全和润色建议
    if (needsCompletion(input)) {
      console.log('processInput - getting word completions for:', lastSegment);
      const completions = await getWordCompletions(lastSegment, aiOptions);
      console.log('processInput - received completions:', completions);
      suggestions.push(...completions.slice(0, 3).map(text => ({
        text: text.toString(),
        type: "completion" as const
      })));
    }

    // 如果不是单纯的补全场景，添加润色建议
    if (totalWords > 1) {
      console.log('processInput - getting polish suggestions for:', input);
      const polishResults = await polishText(input, aiOptions);
      console.log('processInput - received polish results:', polishResults);
      suggestions.push(...polishResults.map(text => ({
        text: text.toString(),
        type: "polish" as const
      })));
    }

    console.log('processInput - returning final suggestions:', JSON.stringify(suggestions, null, 2));
    return suggestions;
  } catch (error) {
    console.error("Error processing input:", error);
    throw error;
  }
}

// 新增润色功能
async function polishText(
  text: string,
  options?: AIRequestOptions
): Promise<string[]> {
  console.log('polishText - received text:', text);

  try {
    const messages = getPolishPrompt(text);
    console.log('polishText - using prompt:', messages);
    const response = await processWithModel(messages, options);
    console.log('polishText - received response:', response);

    // 解析所有变体
    const results = response
      .split("\n")
      .filter((line: string) => line.includes(": "))
      .map((line: string) => line.split(": ")[1].trim());

    const finalResults = results.length >= 3 ? results : [response];
    console.log('polishText - returning results:', finalResults);
    return finalResults;
  } catch (error) {
    console.error("Error polishing text:", error);
    throw error;
  }
}
