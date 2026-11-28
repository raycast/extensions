export const AI_TASKS = {
  summary: {
    title: "Summary",
    prompt:
      "Write a concise summary of this recording: a one-sentence overview, then the main points as a bulleted list.",
  },
  "key-points": {
    title: "Key Points & Decisions",
    prompt:
      "List the key points, decisions made and open questions from this recording, each under its own heading. Skip any heading with nothing to report.",
  },
  "action-items": {
    title: "Action Items",
    prompt:
      'Extract every action item from this recording as a Markdown checklist. Add the owner and the due date only when the recording mentions them; never write placeholders such as "Not specified".',
  },
  translate: {
    title: "Translate",
    prompt: "Translate this transcript into {language}. Keep the meaning and tone, and keep paragraph breaks.",
  },
  "follow-up-email": {
    title: "Follow-up Email",
    prompt:
      "Draft a short, friendly follow-up email based on this recording: thank the participants, recap the decisions and list the next steps.",
  },
  chapters: {
    title: "Chapters & Description",
    prompt:
      "This transcript has a timestamp before each segment. Write, in this order: 1) three title ideas; 2) a two-paragraph description for YouTube or a podcast feed; 3) a chapter list in the YouTube format (one `MM:SS Title` per line, or `H:MM:SS` past one hour), starting at 00:00, 5 to 12 chapters, at least 30 seconds apart, using only timestamps that appear in the transcript; 4) 8 to 12 comma-separated tags.",
  },
  custom: {
    title: "Custom Prompt",
    prompt: "",
  },
} as const;

/** Tasks whose prompt relies on per-segment timestamps in the transcript. */
export const TIMESTAMPED_TASKS: ReadonlySet<string> = new Set(["chapters"]);

export type AITaskId = keyof typeof AI_TASKS;

/** Keeps the prompt within what Raycast AI models accept comfortably. */
const MAX_TRANSCRIPT_CHARS = 120_000;

export type PromptOptions = {
  /** Target language of the translate task. */
  language?: string;
  /** Language of the answer, e.g. "French"; the transcript's own language when empty. */
  answerLanguage?: string;
  custom?: string;
};

export function buildPrompt(task: AITaskId, transcript: string, extra: PromptOptions): string {
  const instruction =
    task === "custom"
      ? extra.custom?.trim() || AI_TASKS.summary.prompt
      : AI_TASKS[task].prompt.replace("{language}", extra.language?.trim() || "English");
  const body =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[Transcript truncated]`
      : transcript;
  const languageRule =
    task === "translate"
      ? ""
      : extra.answerLanguage?.trim()
        ? `Write the whole answer in ${extra.answerLanguage.trim()}.`
        : "Write the whole answer in the same language as the transcript and never switch to another language.";
  return `${instruction}\nAnswer in Markdown. ${languageRule}\n\nTranscript:\n"""\n${body}\n"""`;
}
