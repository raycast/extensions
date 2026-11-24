export const lowercase = (text: string): string => text.toLowerCase();

export const uppercase = (text: string): string => text.toUpperCase();

export const trimWhitespace = (text: string): string => text.trim();

export const oneLine = (text: string): string => text.trim().replace(/\s+/gu, " ");

// Keep apostrophes inside words, including curly apostrophes and combining marks.
// This is deliberately simple title case: every word gets a capital, including "the" and "of".
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\p{L}[\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}\p{N}]+)*/gu, (word) =>
      word.replace(/^\p{L}/u, (letter) => letter.toUpperCase()),
    );
}

// Sentence boundaries are line breaks or . ! ? followed by whitespace (with optional closing quotes).
// This is a formatting heuristic, not a grammar engine; names and abbreviations aren't preserved.
export function sentenceCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\r\n\u2028\u2029]+|[.!?]["'’”)\]}]*\s+)([^\p{L}]*\p{L})/gu, (start) => start.toUpperCase());
}
