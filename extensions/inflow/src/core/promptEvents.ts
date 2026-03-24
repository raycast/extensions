export type PromptPhase = "connecting" | "generating";

export type PromptEvent =
  | { kind: "phase"; phase: PromptPhase }
  | { kind: "reasoning"; text: string }
  | { kind: "content"; text: string };
