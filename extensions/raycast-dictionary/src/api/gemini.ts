import { GoogleGenAI, Type } from "@google/genai";
import { DictionaryEntry } from "../types";

const MODEL = "gemini-3.1-flash-lite-preview";

const SYSTEM_PROMPT = `You are an English dictionary assistant for non-native speakers.
Given a word or phrase, return a clear and helpful definition with real-world example sentences.
Keep definitions plain and accessible. Use the response schema exactly.`;

export async function lookUpWord(word: string, apiKey: string): Promise<DictionaryEntry> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Define the English word or phrase: "${word}"`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: {
            type: Type.STRING,
            description: "The word or phrase exactly as provided",
          },
          phonetic: {
            type: Type.STRING,
            description: "IPA phonetic pronunciation, e.g. /ɪˈfem.ər.əl/",
          },
          partOfSpeech: {
            type: Type.STRING,
            description: "e.g. noun, verb, adjective, adverb",
          },
          definition: {
            type: Type.STRING,
            description: "Clear, plain-English definition accessible to non-native speakers",
          },
          examples: {
            type: Type.ARRAY,
            description: "2 to 3 natural example sentences using the word in context",
            items: { type: Type.STRING },
          },
          synonyms: {
            type: Type.ARRAY,
            description: "3 to 5 common synonyms or related words",
            items: { type: Type.STRING },
          },
        },
        required: ["word", "phonetic", "partOfSpeech", "definition", "examples", "synonyms"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const parsed = JSON.parse(text) as Omit<DictionaryEntry, "provider" | "cachedAt">;
  return { ...parsed, provider: "gemini", cachedAt: Date.now() };
}
