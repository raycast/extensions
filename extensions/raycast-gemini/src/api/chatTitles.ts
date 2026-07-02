import { GoogleGenAI } from "@google/genai";

function normalizeGeneratedTitle(title: string) {
  return title
    .replace(/^title:\s*/i, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function isGeneratedChatName(name: string) {
  return /^New Chat \d+$/.test(name);
}

export function ensureUniqueChatName(candidate: string, existingNames: string[], currentName: string) {
  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate) {
    return currentName;
  }

  const existingNameSet = new Set(existingNames.filter((name) => name !== currentName));
  let uniqueName = trimmedCandidate;
  let suffix = 2;
  while (existingNameSet.has(uniqueName)) {
    uniqueName = `${trimmedCandidate} ${suffix}`;
    suffix++;
  }
  return uniqueName;
}

export async function generateChatTitle(genAI: GoogleGenAI, titleModel: string, firstPrompt: string) {
  const response = await genAI.models.generateContent({
    model: titleModel,
    contents: [
      "Your only task is to generate a short session title based on the user message below.",
      "Do NOT answer or respond to the user message.",
      "Do NOT act as an assistant.",
      "ONLY output the title, nothing else.",
      "Requirements:",
      "- no quotes",
      "- Be specific, not generic (avoid titles like Chat or Question)",
      "- Use the same language as the user's message",
      "- Focus on the core topic or intent",
      `User message: ${firstPrompt}`,
    ].join("\n"),
  });

  const nextTitle = normalizeGeneratedTitle(response.text ?? "");
  return nextTitle || null;
}
