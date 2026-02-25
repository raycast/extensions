export type InterpretationPrompt = {
  id: string;
  title: string;
  instruction: string;
};

export const DEFAULT_INTERPRETATION_PROMPTS: InterpretationPrompt[] = [
  {
    id: "concise-interpretation",
    title: "Concise Interpretation",
    instruction:
      "Give me a concise 2-5 sentence interpretation of these lyrics.\n\nPull out 3 key lyrics and explain them.",
  },
];

export function normalizePromptId(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "prompt"
  );
}
