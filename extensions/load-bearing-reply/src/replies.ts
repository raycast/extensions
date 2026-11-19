export type ReplyMode = "Agree, but intensely" | "Caveat" | "Overanalyse" | "Structural concern" | "Verify first";

export type Reply = { text: string; mode: ReplyMode };

export const replies: Reply[] = [
  {
    text: "You’re half right, but the half where you’re wrong is where things get interesting.",
    mode: "Agree, but intensely",
  },
  { text: "You’re right to question that.", mode: "Agree, but intensely" },
  { text: "That’s exactly the right question.", mode: "Agree, but intensely" },
  { text: "One caveat worth noting…", mode: "Caveat" },
  { text: "There are a couple of important caveats.", mode: "Caveat" },
  { text: "There are several findings here, and one changes the overall decision.", mode: "Overanalyse" },
  { text: "The part that matters is…", mode: "Overanalyse" },
  { text: "Rather than simply accepting that claim…", mode: "Overanalyse" },
  { text: "This is a critical dependency.", mode: "Structural concern" },
  { text: "This is the linchpin.", mode: "Structural concern" },
  { text: "The load-bearing part is…", mode: "Structural concern" },
  { text: "The failure mode is structural: there’s no redundancy here.", mode: "Structural concern" },
  { text: "The outcome follows from the structure.", mode: "Structural concern" },
  { text: "Let me verify that rather than assert it from memory.", mode: "Verify first" },
  { text: "Let me ground this in facts rather than speculate.", mode: "Verify first" },
];
