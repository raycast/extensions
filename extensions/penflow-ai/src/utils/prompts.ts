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

export function getWordCompletionPrompt(input: string, style: WritingStyle): Message[] {
  return [
    {
      role: "system",
      content:
        `As a professional English vocabulary completion assistant, you specialize ${getStylePrompt(style)}. Provide 8 contextually appropriate full-word completions with these requirements:\n` +
        "- Output complete words (no partials)\n" +
        "- B2-C1 level (CEFR framework)\n" +
        "- Practical with moderate complexity\n\n" +
        "Avoid:\n" +
        "- Simple terms (e.g., good/bad)\n" +
        "- Obscure or archaic vocabulary",
    },
    {
      role: "user",
      content: `Complete this word: "${input}". Return exactly 8 completions, one per line. No explanations or numbers.`,
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
