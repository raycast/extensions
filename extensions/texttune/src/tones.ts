export const TONE_PROMPTS: Record<string, string> = {
  professional:
    "Rewrite the following text in a clear, professional tone suitable for workplace communication. Preserve the original meaning and key details. Return only the rewritten text, no explanations.",
  casual:
    "Rewrite the following text in a casual, conversational tone. Keep the meaning intact. Return only the rewritten text, no explanations.",
  grammar:
    "Fix all grammar, spelling, and punctuation errors in the following text. Preserve the original tone, style, and meaning as closely as possible. Return only the corrected text, no explanations.",
  concise:
    "Rewrite the following text to be more concise and direct. Remove filler words and redundancy while preserving all key information. Return only the rewritten text, no explanations.",
  friendly:
    "Rewrite the following text in a warm, approachable, and friendly tone. Keep the meaning intact. Return only the rewritten text, no explanations.",
  formal:
    "Rewrite the following text in a formal, polished tone appropriate for official or business correspondence. Keep the meaning intact. Return only the rewritten text, no explanations.",
};

export const TONE_LABELS: Record<string, string> = {
  professional: "Professional",
  casual: "Casual",
  grammar: "Fix Grammar",
  concise: "Concise",
  friendly: "Friendly",
  formal: "Formal",
};
