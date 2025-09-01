import { useState, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { PreferenceModel } from "../models/preference.model";

const { defaultModel, customModel, apiKey } = getPreferenceValues<PreferenceModel>();
const model = customModel?.trim() || defaultModel;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.x.ai/v1",
});

export interface SolidotItem {
  title: string;
  link: string;
  pubDate: string;
  isoDate: string;
  content: string;
  contentSnippet: string;
}

export function useSolidotSummary() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = useCallback(async (date: string, newsItems: SolidotItem[]): Promise<string> => {
    if (newsItems.length === 0) {
      throw new Error("No news items provided");
    }

    setIsGenerating(true);

    try {
      const newsText = newsItems
        .map(item => `标题: ${item.title}\n内容: ${item.contentSnippet || item.content}\n链接: ${item.link}`)
        .join("\n\n---\n\n");

      const systemPrompt = `你是一个专业的科技新闻编辑。请将以下新闻按行业领域分类，并为每个分类生成简洁的摘要。

要求：
1. 按照相关的技术领域进行分类（如：人工智能、硬件技术、软件开发、网络安全、游戏娱乐等）
2. 每个分类下用简洁的要点形式总结新闻内容
3. 突出重点和关键信息
4. 使用 Markdown 格式

格式示例：
## 人工智能
- 简洁摘要1：关键信息和影响
- 简洁摘要2：重要发展动态

## 硬件技术
- 简洁摘要1：技术突破或产品发布
`;

      const userPrompt = `请为以下 ${date} 的科技新闻生成分类摘要：\n\n${newsText}`;

      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 2048,
        temperature: 0.7,
      });

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        throw new Error("No summary generated");
      }

      return `# ${date} 科技新闻摘要\n\n${summary}`;
    } catch (error) {
      console.error("Failed to generate summary:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateSummary,
    isGenerating,
  };
}
