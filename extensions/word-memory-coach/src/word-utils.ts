const WORD_REGEX = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export function extractEnglishWords(input: string, lowercase = true): string[] {
  const matches = input.match(WORD_REGEX) ?? [];
  const seen = new Set<string>();
  const words: string[] = [];

  for (const rawWord of matches) {
    const word = lowercase ? rawWord.toLowerCase() : rawWord;
    if (word.length < 2) {
      continue;
    }

    if (!seen.has(word)) {
      seen.add(word);
      words.push(word);
    }
  }

  return words;
}

export function createFallbackStudyText(words: string[]): string {
  if (words.length === 0) {
    return "No words have been captured yet today.";
  }

  if (words.length === 1) {
    return `Today I focused on the word "${words[0]}". I will use it in a short sentence, say it aloud, and review it again before the day ends.`;
  }

  const opening = words.slice(0, Math.min(words.length, 6)).join(", ");
  const closing = words.slice(6).join(", ");
  const extraLine = closing
    ? ` Later, I will review these extra words as well: ${closing}.`
    : "";

  return `During today's English practice, I revisited these words: ${opening}. I want to read them aloud, place them into real situations, and turn them into active vocabulary instead of just recognizing them.${extraLine}`;
}

export function formatWordSubtitle(count: number, lastSeenAt: string): string {
  return `Captured ${count} time${count === 1 ? "" : "s"} · Last seen ${new Date(lastSeenAt).toLocaleTimeString()}`;
}
