export const TONES = ["warm", "playful", "sincere", "specific-skill"] as const;
export type Tone = (typeof TONES)[number];

export interface Compliment {
  id: string;
  text: string;
  tone: Tone;
}

export interface Prompt {
  id: string;
  text: string;
  context: string;
  examples: string[];
}
