export function sentenceCase(sentence: string): string {
  sentence = sentence.trim().toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
