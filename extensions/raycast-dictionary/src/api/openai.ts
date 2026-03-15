import OpenAI from "openai";
import { DictionaryEntry } from "../types";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an English dictionary assistant for non-native speakers.
Given a word or phrase, return a JSON object with this exact structure:
{
  "word": "the word exactly as provided",
  "phonetic": "IPA pronunciation e.g. /ɪˈfem.ər.əl/",
  "partOfSpeech": "noun | verb | adjective | adverb | etc.",
  "definition": "clear plain-English definition accessible to non-native speakers",
  "examples": ["sentence 1", "sentence 2", "sentence 3"],
  "synonyms": ["word1", "word2", "word3", "word4", "word5"]
}
Return only valid JSON, no markdown, no extra text.`;

export async function lookUpWord(word: string, apiKey: string): Promise<DictionaryEntry> {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Define the English word or phrase: "${word}"` },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(text) as Omit<DictionaryEntry, "provider" | "cachedAt">;
  return { ...parsed, provider: "openai", cachedAt: Date.now() };
}
