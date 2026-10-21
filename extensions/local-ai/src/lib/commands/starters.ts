import type { Creativity } from "../fm/args";
import type { AiCommand, CommandDefaults, OutputMode } from "./types";

interface StarterSpec {
  name: string;
  icon: string;
  creativity: Creativity;
  output: OutputMode;
  prompt: string;
}

const STARTER_SPECS: StarterSpec[] = [
  {
    name: "Make Professional",
    icon: "Envelope",
    creativity: "normal",
    output: "replace",
    prompt:
      "Rewrite {selection} in a professional, polite tone. Keep the meaning, the language and roughly the length.",
  },
  {
    name: "Make Casual",
    icon: "SpeechBubble",
    creativity: "normal",
    output: "replace",
    prompt: "Rewrite {selection} in a relaxed, casual tone. Keep the meaning and the language.",
  },
  {
    name: "Make Friendly",
    icon: "Emoji",
    creativity: "normal",
    output: "replace",
    prompt: "Rewrite {selection} so it sounds warm and friendly. Keep the meaning and the language.",
  },
  {
    name: "Make Shorter",
    icon: "Minimize",
    creativity: "normal",
    output: "replace",
    prompt:
      "Rewrite {selection} so it is about half as long. Drop filler and secondary details, keep the key points and the language.",
  },
  {
    name: "Make Longer",
    icon: "Maximize",
    creativity: "normal",
    output: "replace",
    prompt:
      "Rewrite {selection} so it is longer and more fully worded, keeping its tone and language. Add only elaboration of what it already says. Do not invent facts, names, dates or commitments, and do not add a sign-off or an offer of further help.",
  },
  {
    name: "Fix Spelling and Grammar",
    icon: "CheckCircle",
    creativity: "precise",
    output: "replace",
    prompt: "Correct the spelling, grammar and punctuation of {selection}. Change nothing else.",
  },
  {
    name: "Improve Writing",
    icon: "Wand",
    creativity: "normal",
    output: "replace",
    prompt: "Improve the clarity and flow of {selection}. Keep the meaning, tone and language.",
  },
  {
    name: "Simplify",
    icon: "ShortParagraph",
    creativity: "normal",
    output: "replace",
    prompt: "Rewrite {selection} in plain, simple words that are easy to understand.",
  },
  {
    name: "Summarize",
    icon: "BulletPoints",
    creativity: "precise",
    output: "window",
    prompt: "Summarize {selection} as a few short bullet points.",
  },
  {
    name: "Explain Simply",
    icon: "LightBulb",
    creativity: "normal",
    output: "window",
    prompt: "Explain {selection} in simple terms, as if to a curious friend.",
  },
  {
    name: "Translate",
    icon: "Globe",
    creativity: "precise",
    output: "replace",
    prompt: 'Translate {selection} into {argument name="language" default="English"}. Keep the formatting.',
  },
];

export const STARTER_IDS: readonly string[] = STARTER_SPECS.map((spec) => starterId(spec.name));

export function starterCommands(now: string, defaults: CommandDefaults): AiCommand[] {
  return STARTER_SPECS.map((spec) => ({
    id: starterId(spec.name),
    name: spec.name,
    icon: spec.icon,
    prompt: spec.prompt,
    output: spec.output,
    model: defaults.model,
    creativity: spec.creativity,
    useCase: "general",
    guardrails: "permissive",
    pinned: false,
    isStarter: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function starterId(name: string): string {
  return `starter-${name.toLowerCase().replace(/\s+/g, "-")}`;
}
