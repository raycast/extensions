import { AI } from "@raycast/api";
import Model = AI.Model;

export interface WordInfo {
  word: string;
  decomp?: string;
  pronunciation: string;
  definitions: {
    pos: string;
    cn_mean: string;
    var_form?: {
      verb_form?: { passive?: string; participles?: string };
      adj_form?: { cmp?: string };
      noun_form?: { plural?: string };
    };
    example?: string;
  }[];
}

// 定义可用的模型列表
export const AvailableModels = ["Groq_GPT-OSS_20b", "Groq_GPT-OSS_120b", "Google_Gemini_3_Pro"] as const;

export type AIModel = (typeof AvailableModels)[number];

export async function extractJsonFromAI(prompt: string, signal: AbortSignal, model: AIModel = "Groq_GPT-OSS_20b") {
  const maxRetries = 3;
  let jsonMatch;
  for (let i = 0; i < maxRetries; i++) {
    const rawResponse = await AI.ask(prompt, { model: Model[model], signal: signal });
    try {
      console.log("AI Response:", rawResponse.slice(0, 20) + "...");
      jsonMatch = rawResponse.match(/{[\s\S]*}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      console.error("Failed to parse AI response:", rawResponse, error);
    }
  }
  throw new Error("Max retries reached, no JSON match found.");
}

export async function queryWord(word: string, signal: AbortSignal, model: AIModel = "Groq_GPT-OSS_20b") {
  const prompt = `Eliminate input errors, process and ultimately output the information of "${word}" in JSON format:
{ "word": "query word",
  "decomp": "decompose and connect by ·",
  "pronunciation": "/[pronunciation/]",
  "definitions": [{ // each item has only one meaning
    "pos": "parts of speech abbreviation('adj.', 'adv'., 'n.', 'vi.', 'vt.', 'prep.')",
    "cn_mean": "chinese meaning",
    "var_form": { // only present the form of the word
      "verb_form": { "participles": "Past tense, past participle, present participle"},
      "adj_form": {"cmp": "comparative form"},
      "noun_form": {"plural": "plural form (output uncountable if it does not exist)"}
    },
    "example": "example sentence"}]
}`;
  const jsonMatch = await extractJsonFromAI(prompt, signal, model);
  if (!jsonMatch) {
    return { word: word, pronunciation: "", definitions: [], decomp: "", example: "" } as WordInfo;
  }
  return jsonMatch as WordInfo;
}

export interface translateWordInfo {
  candidate: string;
  usage: string;
  example: string;
}

export interface SentenceTranslation {
  original: string;
  translation: string;
  lang: string;
}

// 中文查询，返回多个候选单词，并进行辨析
export async function translateWord(word: string, signal: AbortSignal, model: AIModel = "Groq_GPT-OSS_20b") {
  const prompt = `Translate "${word}" to English. If there is multiple candidates, differentiate there usage scenarios. Return in list of candidates.
{
  "candidates": [{
    "candidate": "candidate",
    "usage": "区别于其他词汇的关键点，用简短中文回复"
    "example": "英文例句",
  }]
}`;
  const jsonMatch = await extractJsonFromAI(prompt, signal, model);
  return jsonMatch?.candidates ? jsonMatch.candidates : [];
}

export async function translateSentence(
  text: string,
  lang: string,
  signal: AbortSignal,
  onUpdate: (data: SentenceTranslation) => void,
  model: AIModel = "Groq_GPT-OSS_20b",
) {
  const targetLang = lang === "zh" ? "English" : "Chinese";
  const prompt = `Translate the following text to ${targetLang}. Translation should be grounded in understanding, producing fluent, readable, formatted text. Only return the translated text.
  Followings are the original text:
  ${text}
  `;

  let translation = "";
  const stream = AI.ask(prompt, { model: Model[model], signal: signal });

  stream.on("data", (chunk) => {
    translation += chunk;
    onUpdate({
      original: text,
      translation: translation,
      lang: lang,
    });
  });

  await stream;

  return {
    original: text,
    translation: translation,
    lang: lang,
  } as SentenceTranslation;
}
