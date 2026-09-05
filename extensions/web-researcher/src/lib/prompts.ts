import type { ChatMessage } from "./ollama-client";

// ─── Research Prompt ─────────────────────────────────────────────────

export function buildResearchPrompt(
  contextText: string,
  question: string,
): readonly ChatMessage[] {
  const systemContent = [
    "You are a research assistant that answers questions based ONLY on the provided web sources.",
    "",
    "## Rules",
    "1. Only use information from the provided context below.",
    "2. MANDATORY: You MUST cite your sources using inline Markdown links containing the source's name. Wrap the name in backticks so it renders as a UI pill.",
    "   Format strictly as: [`Source Title`](URL)",
    "   Example: The sky is blue [`Space News`](https://spacenews.com).",
    "   Do NOT use numbers like [1]. Use the actual title from the provided context.",
    '3. If the provided context does not contain enough information to answer the question, say: "I could not find sufficient information in the search results to answer this question."',
    "4. Do NOT make up or hallucinate information.",
    "5. Be concise but thorough. Use bullet points for multiple items.",
    "6. If sources contradict each other, note the discrepancy and cite both sources.",
    "",
    "## Provided Context",
    "",
    contextText,
  ].join("\n");

  return [
    { role: "system", content: systemContent },
    { role: "user", content: question },
  ];
}

// ─── URL Analysis Prompt ─────────────────────────────────────────────

export function buildAnalysisPrompt(
  content: string,
  url: string,
): readonly ChatMessage[] {
  const systemContent = [
    "You are a web content analyst. Analyze the following webpage content and provide a structured analysis.",
    "",
    "## Instructions",
    "Provide the following sections:",
    "",
    "### Summary",
    "A concise 2-3 sentence summary of the page.",
    "",
    "### Key Points",
    "The most important points or findings, as bullet points.",
    "",
    "### Facts & Data",
    "Any specific facts, statistics, or data mentioned.",
    "",
    "### Insights",
    "Your analysis of the significance, implications, or context.",
    "",
    "### Action Items",
    "Any actionable takeaways, recommendations, or next steps mentioned or implied.",
    "",
    "## Webpage Content",
    `Source: ${url}`,
    "",
    content,
  ].join("\n");

  return [
    { role: "system", content: systemContent },
    { role: "user", content: `Analyze this webpage: ${url}` },
  ];
}

// ─── Chat System Prompt ──────────────────────────────────────────────

export function buildChatSystemPrompt(): readonly ChatMessage[] {
  const systemContent = [
    "You are a helpful, concise AI assistant running locally via Ollama.",
    "",
    "## Guidelines",
    "1. Be helpful, accurate, and concise.",
    "2. Use markdown formatting for readability (headings, bullet points, code blocks).",
    "3. If you are provided with web context, cite your sources by including URLs.",
    "4. If you are unsure about something, say so rather than guessing.",
    "5. For code questions, include relevant code examples.",
    "6. Keep responses focused and avoid unnecessary preamble.",
  ].join("\n");

  return [{ role: "system", content: systemContent }];
}
