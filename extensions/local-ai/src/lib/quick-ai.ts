export const QUICK_AI_INSTRUCTIONS =
  "Answer the question concisely in Markdown. If context text is provided, base the answer on it. Say so when you are not sure.";

export function buildQuickAiStdin(question: string, context?: string): string {
  if (!context?.trim()) return question;
  return `Context:\n${context}\n\nQuestion:\n${question}`;
}
