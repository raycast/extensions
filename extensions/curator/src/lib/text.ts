export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.。!?！？]/);
  return stop > 0 ? t.slice(0, stop + 1) : t.slice(0, 80);
}
