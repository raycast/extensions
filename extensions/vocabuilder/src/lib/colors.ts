import { Color } from "@raycast/api";

const POS_COLORS: Record<string, Color> = {
  noun: Color.Blue,
  verb: Color.Red,
  adjective: Color.Green,
  adverb: Color.Magenta,
  preposition: Color.Yellow,
  pronoun: Color.Purple,
  conjunction: Color.Orange,
  interjection: Color.SecondaryText,
};

export function posColor(partOfSpeech: string): Color {
  return POS_COLORS[partOfSpeech.toLowerCase().trim()] ?? Color.Blue;
}
