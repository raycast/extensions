import Anthropic from "@anthropic-ai/sdk";
import { DictionaryEntry } from "../types";

const MODEL = "claude-haiku-4-5-20251001";

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
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Define the English word or phrase: "${word}"` }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = JSON.parse(block.text) as Omit<DictionaryEntry, "provider" | "cachedAt">;
  return { ...parsed, provider: "claude", cachedAt: Date.now() };
}
