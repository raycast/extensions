/** The languages in the Translate Selected Text dropdowns in package.json. */
export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Danish",
  "Norwegian",
  "Turkish",
  "Vietnamese",
  "Japanese",
  "Korean",
  "Simplified Chinese",
  "Traditional Chinese",
];

export type Tone = "professional" | "friendly" | "concise" | "simple";

export type TextTask =
  | { kind: "summarize" }
  | { kind: "rewrite"; tone: Tone }
  | { kind: "proofread" }
  | { kind: "translate"; language: string }
  | { kind: "explain" };

const toneDescriptions: Record<Tone, string> = {
  professional: "a clear, professional tone",
  friendly: "a warm, friendly tone",
  concise: "fewer words, keeping every important point",
  simple: "simpler words and shorter sentences",
};

/** Short, direct instructions work best with the ~3B on-device model. */
export function taskInstructions(task: TextTask): string {
  switch (task.kind) {
    case "summarize":
      return "Summarize the text the user sends in 2 to 5 short bullet points with only its key points, in the same language as the text. Do not add points that are not in the text. Output only the bullet points.";
    case "rewrite":
      return `Rewrite the text the user sends using ${toneDescriptions[task.tone]}. Keep its meaning and its language. Output only the rewritten text, with no introduction.`;
    case "proofread":
      return "Fix the spelling, grammar and punctuation of the text the user sends. Keep its wording, tone and language. Output only the corrected text.";
    case "translate":
      return `Translate the text the user sends into ${task.language}. Output only the translation.`;
    case "explain":
      return "Explain the text the user sends in simple words, in the same language as the text. Use a short paragraph, and a few bullet points if they help.";
  }
}

export function taskTitle(task: TextTask): string {
  switch (task.kind) {
    case "summarize":
      return "Summary";
    case "rewrite":
      return `Rewritten (${task.tone})`;
    case "proofread":
      return "Proofread";
    case "translate":
      return `Translation (${task.language})`;
    case "explain":
      return "Explanation";
  }
}

export function isTone(value: string | undefined): value is Tone {
  return value === "professional" || value === "friendly" || value === "concise" || value === "simple";
}

/** Checks a task that arrives from outside the code, for example in a command's launch context. */
export function toTextTask(value: unknown): TextTask | undefined {
  const task = value as Partial<{ kind: string; tone: string; language: string }> | undefined;
  switch (task?.kind) {
    case "summarize":
    case "proofread":
    case "explain":
      return { kind: task.kind };
    case "rewrite":
      return isTone(task.tone) ? { kind: "rewrite", tone: task.tone } : undefined;
    case "translate":
      return task.language && LANGUAGES.includes(task.language)
        ? { kind: "translate", language: task.language }
        : undefined;
    default:
      return undefined;
  }
}
