const cpLen = (s: string): number => [...s].length;
const padEnd = (s: string, width: number): string =>
  s + " ".repeat(Math.max(0, width - cpLen(s)));
const trimEnd = (s: string): string => s.replace(/\s+$/u, "");

export interface Col {
  mark: string;
  word: string;
}

export function alignColumns(
  cols: Col[],
  gap = 2,
): { markLine: string; wordLine: string } {
  const sep = " ".repeat(gap);
  const marks: string[] = [];
  const words: string[] = [];
  for (const c of cols) {
    const width = Math.max(cpLen(c.mark), cpLen(c.word));
    marks.push(padEnd(c.mark, width));
    words.push(padEnd(c.word, width));
  }
  return {
    markLine: trimEnd(marks.join(sep)),
    wordLine: trimEnd(words.join(sep)),
  };
}
