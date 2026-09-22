export const DETECT_LANGUAGE_INSTRUCTIONS =
  "Identify the language of the text. Answer with the English name of the language only, one word.";

export const OCR_INSTRUCTIONS =
  "Transcribe all text visible in the image exactly as written, keeping line breaks. " +
  "Never translate or correct it. Reply with only the transcribed text.";

export const fixGrammarInstructions = (language: string) =>
  `You are a proofreader for ${language} text. Correct spelling, conjugation and grammar mistakes and change nothing else. ` +
  `The text is ${language}: your answer must be ${language} too, never translated. Reply with only the corrected text.`;

export const TONES = [
  { id: "default", title: "Default", directive: "" },
  {
    id: "professional",
    title: "Professional",
    directive: "polished and professional, suitable for work communication",
  },
  {
    id: "casual",
    title: "Casual",
    directive: "relaxed and casual, like talking to a friend",
  },
  { id: "friendly", title: "Friendly", directive: "warm and friendly" },
  {
    id: "formal",
    title: "Formal",
    directive: "formal and respectful, avoiding contractions and slang",
  },
  {
    id: "concise",
    title: "Concise",
    directive: "short and to the point, dropping anything unnecessary",
  },
] as const;

export type ToneId = (typeof TONES)[number]["id"];

export const toneTitle = (id: ToneId) =>
  TONES.find((tone) => tone.id === id)?.title ?? "Default";

export const rephraseInstructions = (id: ToneId) => (language: string) => {
  const directive = TONES.find((tone) => tone.id === id)?.directive;
  return (
    `You rewrite ${language} text with different words so it is clearer and more natural, keeping its meaning. ` +
    (directive ? `The tone must be ${directive}. ` : "") +
    `The text is ${language}: your answer must be ${language} too, never translated. Reply with only the rewritten text.`
  );
};
