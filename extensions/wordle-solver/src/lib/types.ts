export type Color = "gray" | "yellow" | "green";

export type Pattern = readonly [Color, Color, Color, Color, Color];

export type PatternCode = number;

export type Guess = { word: string; pattern: Pattern };

export type GameState = { guesses: Guess[] };
