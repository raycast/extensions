import type { Keyboard } from "@raycast/api";

export interface TextAction {
  title: string;
  subtitle: string;
  system: string;
  buildPrompt: (text: string, option: string) => string;
  selector?: {
    title: string;
    metadataLabel: string;
    shortcut: Keyboard.Shortcut;
    options: string[];
  };
}

export const TEXT_ACTIONS: TextAction[] = [
  {
    title: "Fix Grammar",
    subtitle: "Fix grammar of the currently selected text.",
    system: "You are a grammar correction assistant.",
    buildPrompt: (text) =>
      `Fix the grammar and spelling in the following text. Do not change the original meaning or add conversational filler, just return the corrected text:\n\n${text}`,
  },
  {
    title: "Change Tone",
    subtitle: "Change the tone of the currently selected text.",
    system: "You are a text rewriting assistant.",
    buildPrompt: (text, tone) =>
      `Rewrite the following text in a ${tone} tone. Do not add any conversational filler, just return the exact new text:\n\n${text}`,
    selector: {
      title: "Change Tone",
      metadataLabel: "Tone",
      shortcut: {
        macOS: { modifiers: ["cmd"], key: "t" },
        Windows: { modifiers: ["ctrl"], key: "t" },
      },
      options: ["Professional", "Casual", "Friendly", "Direct", "Academic"],
    },
  },
  {
    title: "Paraphrase",
    subtitle: "Paraphrase and improve the currently selected text.",
    system: "You are a paraphrasing assistant.",
    buildPrompt: (text) =>
      `Paraphrase and improve the following text. Make it sound native and clear. Do not add any conversational filler or markdown code blocks, just return the exact text:\n\n${text}`,
  },
  {
    title: "Summarize",
    subtitle: "Summarize the currently selected text.",
    system: "You are a summarization assistant.",
    buildPrompt: (text) =>
      `Summarize the following text concisely. Do not add conversational filler, just return the summary:\n\n${text}`,
  },
  {
    title: "Translate",
    subtitle: "Translate the currently selected text.",
    system: "You are a translation assistant.",
    buildPrompt: (text, language) =>
      `Translate the following text to ${language}. Do not add any conversational filler, just return the exact translation:\n\n${text}`,
    selector: {
      title: "Change Language",
      metadataLabel: "Language",
      shortcut: {
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      },
      options: [
        "English",
        "Spanish",
        "French",
        "German",
        "Italian",
        "Portuguese",
      ],
    },
  },
];
