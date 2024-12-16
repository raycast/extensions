import { WritingStyle } from "./types";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getStylePrompt(_style: WritingStyle): string {
  const stylePrompts: Record<WritingStyle, string> = {
    [WritingStyle.Professional]: "in a professional and formal tone",
    [WritingStyle.Casual]: "in a casual and natural tone",
    [WritingStyle.Academic]: "in an academic and scholarly tone",
  };
  return stylePrompts[WritingStyle.Professional];
}

export function getWordCompletionPrompt(
  input: string,
  style: WritingStyle
): Message[] {
  return [
    {
      role: "system",
      content:
        "You are a helpful English writing assistant. Provide 5 single-word completions that are most relevant and commonly used.",
    },
    {
      role: "user",
      content: `Complete this word: "${input}". Return exactly 5 completions, one per line. No explanations or numbers.`,
    },
  ];
}

export function getPolishPrompt(text: string): Message[] {
  return [
    {
      role: "system",
      content:
        "You are a helpful English writing assistant. Provide three different versions of the text in professional, casual, and academic tones.",
    },
    {
      role: "user",
      content: `Polish this text in three styles and return them in exactly this format:
Professional: <professional version>
Casual: <casual version>
Academic: <academic version>

Text to polish: "${text}"`,
    },
  ];
}

export function getTranslationPrompt(text: string): Message[] {
  return [
    {
      role: "system",
      content:
        "You are a professional English-Chinese translator. Translate Chinese to English accurately and naturally, then provide three style variations.",
    },
    {
      role: "user",
      content: `Translate and polish this Chinese-English mixed text in three styles. Return in exactly this format:
Translation: <direct translation>
Professional: <formal version>
Casual: <natural version>
Academic: <scholarly version>

Text to translate: "${text}"`,
    },
  ];
}
