export type Mode = "time" | "words" | "quote";
export type RenderMode = "svg" | "terminal";
export type UpdateFreq = "instant" | "fast" | "slow" | "very_slow";

export type SvgSettings = {
  fontSize: string;
  colorCorrect: string;
  colorWrong: string;
  colorNext: string;
  colorHighlight: string;
  caretStyle: string;
};

export type TerminalSettings = {
  styleCorrect: string;
  styleWrong: string;
  styleCurrent: string;
  caretChar: string;
};

export type Quote = {
  text: string;
  source: string;
  length: number;
  id: number;
};
