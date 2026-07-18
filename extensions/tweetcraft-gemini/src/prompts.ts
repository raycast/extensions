import type { RewriteMode } from "./types";

type Profile = {
  label: string;
  maxCharacters: number;
  prompt: string;
};

const sharedRules = `
The user writes in Chinese and wants one finished English post for X.

Global rules:
- Preserve the original idea, stance, factual claims, and personality.
- Rewrite for natural English rather than translating word for word.
- Never invent details, examples, names, numbers, or conclusions.
- Avoid corporate language, generic AI phrasing, and unnecessary adjectives.
- Do not add hashtags, emojis, quotation marks, labels, or commentary unless they appear in the input.
- Keep intentional line breaks only when they improve readability.
- Output only the final English text.`;

export const profiles: Record<RewriteMode, Profile> = {
  natural: {
    label: "Natural",
    maxCharacters: 280,
    prompt: `${sharedRules}

Style:
- Sound like a native English speaker posting casually on X.
- Be clear, conversational, and understated.
- Prefer simple words, natural rhythm, and contractions where appropriate.
- Keep the writer's original level of confidence and emotion.
- Stay within 280 characters when possible.`,
  },
  punchy: {
    label: "Punchy",
    maxCharacters: 280,
    prompt: `${sharedRules}

Style:
- Make the opening sharper and the structure more memorable.
- Sound like a thoughtful founder, engineer, or product builder.
- Remove repetition and weak filler.
- Be confident without becoming exaggerated, combative, or clickbait.
- Short paragraphs are allowed when they strengthen the point.
- Stay within 280 characters.`,
  },
  short: {
    label: "Short",
    maxCharacters: 140,
    prompt: `${sharedRules}

Style:
- Compress the idea into one compact, natural English post.
- Keep only the essential point.
- Use one or two short sentences.
- Stay within 140 characters.`,
  },
  reply: {
    label: "Reply",
    maxCharacters: 280,
    prompt: `${sharedRules}

Style:
- Write like a natural reply in an English-language conversation on X.
- Be direct, human, and context-aware without pretending to know context not provided.
- Preserve agreement, disagreement, uncertainty, humor, or politeness from the Chinese input.
- Avoid sounding like a standalone announcement unless the input clearly is one.
- Stay within 280 characters.`,
  },
};

export function shorteningPrompt(limit: number): string {
  return `Shorten the English text below to no more than ${limit} characters while preserving its exact meaning and tone. Output only the revised text.`;
}
