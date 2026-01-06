const SYSTEM_PROMPT_TEMPLATE = `
You are an expert grammar and style checker. Your task is to analyze the provided text and correct it according to the specified style.

STYLE: {{STYLE}}

INSTRUCTIONS:
1. Analyze the text for grammar, spelling, punctuation, and style issues.
2. Provide a corrected version of the text.
3. List all issues found with detailed explanations.
4. Return the result strictly in the following JSON format:

{
  "corrected": "The corrected text",
  "issues": [
    {
      "type": "grammar|spelling|punctuation|style",
      "severity": "error|warning|suggestion",
      "original": "the original phrase",
      "correction": "the corrected phrase",
      "explanation": "why this is wrong"
    }
  ]
}

IMPORTANT:
- Ensure the JSON is valid.
- Do not include any text outside the JSON object.
- If the text is perfect, return an empty "issues" array and the original text as "corrected".
`;

export const STYLES: Record<string, string> = {
  casual:
    "Casual. Keep the tone informal and friendly. Fix basic grammar and spelling errors, but preserve slang and colloquialisms if they fit the context. Focus on readability.",
  professional:
    "Professional. Ensure the text is business-appropriate, clear, and concise. Fix all grammar and punctuation errors. Use formal vocabulary where appropriate. Avoid slang.",
  academic:
    "Academic. Strictly enforce formal grammar and punctuation rules. Use precise and sophisticated vocabulary. Ensure objective and analytical tone.",
  creative:
    "Creative. Preserve the author's unique voice and artistic choices. Focus on clarity and flow. distinct corrections only for clear errors, while offering stylistic suggestions to enhance impact.",
};

export function getSystemPrompt(styleKey: string): string {
  const styleDescription = STYLES[styleKey] || STYLES.professional;
  return SYSTEM_PROMPT_TEMPLATE.replace("{{STYLE}}", styleDescription);
}
