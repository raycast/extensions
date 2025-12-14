import axios from "axios";
import { DeepSeekRequest, DeepSeekResponse } from "../types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * Generate word definition and translation using DeepSeek AI
 * @param word - The word to define
 * @param context - The context sentence/paragraph containing the word
 * @param apiKey - DeepSeek API key
 * @returns AI-generated definition and translation
 */
export async function generateDefinition(
  word: string,
  context: string,
  apiKey: string,
): Promise<string> {
  const prompt = `你是一个英语学习助手。请为以下单词提供完整的学习信息。

单词：${word}

原始上下文句子：${context}

请严格按以下格式输出（每项单独一行，不要有编号或标题）：
第一行：修正后的完整句子（如果原句有换行符、多余空格或格式问题，请修正为完整流畅的句子；如果句子残缺，请补全）
第二行：单词的各种形式（用逗号分隔，如：go, goes, going, went, gone 或 beautiful, more beautiful, most beautiful, beautifully）
第三行：词性的英文缩写 + 空格 + 中文释义（如：adj. 有韧性的；能迅速恢复的）
第四行：修正后句子的完整中文翻译

示例输出格式：
The resilient entrepreneur persevered through countless setbacks.
resilient, more resilient, most resilient, resiliently
adj. 有韧性的；能迅速恢复的
这位坚韧的企业家在无数次挫折中坚持了下来。

注意：
1. 第一行必须是语法正确、格式整洁的完整句子
2. 如果原句有明显的PDF复制问题（换行、连字符等），请修正
3. 单词形式包括：动词的各种时态、名词的复数、形容词的比较级/最高级、副词形式等
4. 词性必须用英文缩写（n., v., adj., adv., prep., conj., pron., interj.）
5. 输出要简洁明了，适合做成 Anki Cloze 卡片学习`;

  const requestData: DeepSeekRequest = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content:
          "你是一个专业的英语学习助手，擅长提供简洁准确的单词释义和翻译。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  try {
    const response = await axios.post<DeepSeekResponse>(
      DEEPSEEK_API_URL,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000, // 30 seconds timeout
      },
    );

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error("No response from DeepSeek API");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `DeepSeek API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`,
        );
      } else if (error.request) {
        throw new Error(
          "No response from DeepSeek API. Please check your network connection.",
        );
      }
    }
    throw new Error(
      `Failed to generate definition: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
