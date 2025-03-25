export function capitalizeWord(word: string) {
  if (typeof word !== "string" || word.length === 0) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
export function remapType(type: string) {
  return (
    { "ADJ.": "Adjective", "PREP.": "Preposition", "ADV.": "Adverb", PHRASES: "Phrases", "QUANT.": "Quantity" }[type] ??
    type
  );
}
