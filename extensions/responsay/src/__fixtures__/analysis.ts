import type { ProsodyAnalysis } from "../types";

export const EXAMPLE: ProsodyAnalysis = {
  text: "If you finish early, give me a call.",
  isGeneratedExample: false,
  ipa: "/ɪf ju ˈfɪnɪʃ ˈɝli ‖ ˈɡɪv mi ə ˈkɔl/",
  thoughtGroups: [
    {
      tone: "rise",
      words: [
        {
          text: "If",
          syllables: ["If"],
          stressIndex: null,
          stressed: false,
          nuclear: false,
        },
        {
          text: "you",
          syllables: ["you"],
          stressIndex: null,
          stressed: false,
          nuclear: false,
        },
        {
          text: "finish",
          syllables: ["fin", "ish"],
          stressIndex: 0,
          stressed: true,
          nuclear: false,
          linkToNext: "liaison",
        },
        {
          text: "early",
          syllables: ["ear", "ly"],
          stressIndex: 0,
          stressed: true,
          nuclear: true,
        },
      ],
    },
    {
      tone: "fall",
      words: [
        {
          text: "give",
          syllables: ["give"],
          stressIndex: 0,
          stressed: true,
          nuclear: false,
        },
        {
          text: "me",
          syllables: ["me"],
          stressIndex: null,
          stressed: false,
          nuclear: false,
        },
        {
          text: "a",
          syllables: ["a"],
          stressIndex: null,
          stressed: false,
          nuclear: false,
        },
        {
          text: "call",
          syllables: ["call"],
          stressIndex: 0,
          stressed: true,
          nuclear: true,
        },
      ],
    },
  ],
  notes:
    "Let the pitch rise on “early” to signal more is coming, then fall firmly on “call.”",
};
