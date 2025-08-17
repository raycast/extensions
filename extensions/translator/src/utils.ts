import { Clipboard } from "@raycast/api";
import { LANGUAGES, SUPPORT_PROVIDERS } from "./constant";
import { TranslationResult, ollamaResponseData } from "./types";

export async function translateByAI({
  text,
  targetLanguage,
  server,
  modelName,
  apiKey,
}: {
  text: string;
  targetLanguage: string;
  server: string;
  modelName: string;
  apiKey?: string;
}): Promise<TranslationResult> {
  console.log(
    `【translateByAI】text: ${text} targetLanguage: ${targetLanguage} server: ${server} modelName: ${modelName} apiKey: ${apiKey}`,
  );
  if (text.trim() === "") {
    throw new Error("Text is empty");
  }
  const targetLangName = LANGUAGES.find((lang) => lang.code === targetLanguage)?.name || targetLanguage;
  console.log("【translateByAI】apiKey:", apiKey);

  const prompt = `【角色】
                  你是一个专业的翻译引擎，只负责把输入文本翻译成指定语言。
                  【目标】
                  '${text}'翻译成'${targetLangName}'。
                  【规则】
                  1. 禁止输出任何推理、解释、注释、编号、Markdown、HTML、XML、LaTeX、代码块。  
                  2. 禁止出现“翻译结果：”“以下是译文”等引导语。  
                  3. 如果原文包含 <think>、<reasoning> 等标签，直接忽略并删除这些标签。  
                  4. 最终输出必须是纯文本，且与原文语义一致，保持简洁自然。  
                  5. 若原文已有换行，保留换行；否则保持单行输出。
                  9. 把结果放在一个JSON字符串中，格式为：\`\`\`json {"original": "原文", "translation": "译文"} \`\`\`
                  10. 请严格按照这个格式字段，第一个字段为'original'，第二个字段为'translation'。
                  【示例】
                  \`\`\`json
                  {"original": "你好", "translation": "hello"}
                  \`\`\`
                  【示例】
                  \`\`\`json
                  {"original": "Hello", "translation": "你好"}
                  \`\`\`
                  `;
  try {
    const provider = SUPPORT_PROVIDERS.find((p) => p.name.toLowerCase() === server.toLowerCase());
    if (!provider) {
      throw new Error(`Provider ${server} not found`);
    }
    console.log("【translateText】provider:", provider);
    const response = await fetch(`${provider?.url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, prompt, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as ollamaResponseData;
    console.log("【translateByAI】data:", data);
    const responseText = data.response;
    Clipboard.copy(responseText);
    const jsonResult = responseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1];
    if (!jsonResult) {
      throw new Error("JSON result not found in response");
    }
    return JSON.parse(jsonResult) as TranslationResult;
  } catch (error) {
    console.error("Translation failed:", error);
    throw new Error("Translation failed. Please make sure Ollama is running locally.");
  }
}

// export async function speakText(text: string, language: string): Promise<void> {
//   if (typeof window !== "undefined" && "speechSynthesis" in window) {
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.lang = language;
//     window.speechSynthesis.speak(utterance);
//   }
// }
