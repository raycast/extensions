import quotes from "./quotes.json";

const FALLBACK_PROMPTS = [
  "Typing builds muscle memory one keystroke at a time.",
  "Small daily practice creates big improvements.",
  "Focus on accuracy before you chase speed.",
  "Clear minds type better than rushed ones.",
  "A steady rhythm beats frantic bursts.",
  "Practice turns awkward motions into smooth flow.",
  "Good posture helps your hands stay relaxed.",
  "Speed arrives after consistency.",
  "Let your fingers learn the path.",
  "Precision first, pace later.",
  "Warm up with calm and steady intent.",
  "Short sessions add up faster than you think.",
  "Breathe, relax, and keep a light touch.",
  "Mistakes are data, not failure.",
  "One more line makes you better than yesterday.",
  "Your typing voice is found in repetition.",
  "Keep your eyes on the words, not the keys.",
  "Confidence grows with every correct line.",
  "Start slow, finish strong.",
  "Every sentence is a tiny checkpoint.",
];

const PROMPTS = quotes.length > 0 ? quotes : FALLBACK_PROMPTS;

export function getRandomPrompt(previous?: string): string {
  if (PROMPTS.length === 0) {
    return "Start typing.";
  }
  if (PROMPTS.length === 1) {
    return PROMPTS[0];
  }

  let next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  while (next === previous) {
    next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  }
  return next;
}
