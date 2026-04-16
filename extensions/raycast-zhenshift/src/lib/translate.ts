import { detectLanguageDirection } from "./detect-language";
import { requestChatCompletion } from "./openai-compatible-client";

export async function translateText(input: {
  text: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}) {
  const direction = detectLanguageDirection(input.text);
  if (direction.status !== "ready") {
    throw new Error("请输入中文或英文文本");
  }

  const targetLanguage = direction.targetLanguage === "en" ? "English" : "中文";
  const translation = await requestChatCompletion({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model,
    messages: [
      {
        role: "system",
        content: `你是一个中英翻译器。请将用户输入翻译为${targetLanguage}。只返回译文，不要解释，不要添加引号，不要补充说明。`,
      },
      {
        role: "user",
        content: input.text,
      },
    ],
  });

  return {
    directionLabel: direction.directionLabel,
    translation,
  };
}
