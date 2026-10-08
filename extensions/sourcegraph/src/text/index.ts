export function sentenceCase(sentence: string): string {
  sentence = sentence.trim().toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function count(value: number, singular: string, plural: string): string {
  return value != 1 ? `${value} ${plural}` : `${value} ${singular}`;
}
