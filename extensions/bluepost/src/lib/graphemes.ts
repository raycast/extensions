const segmenter = new Intl.Segmenter();

export function countGraphemes(text: string): number {
  return [...segmenter.segment(text)].length;
}

export function truncateGraphemes(text: string, limit: number): string {
  const segments = [...segmenter.segment(text)];
  if (segments.length <= limit) return text;
  return (
    segments
      .slice(0, limit - 1)
      .map((s) => s.segment)
      .join("") + "\u2026"
  );
}
