export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // remove punctuation
    .replace(/\b(a|an|the|to)\b/g, "") // remove common articles/particles
    .replace(/\s+/g, " ") // compress multiple spaces
    .trim();
}

export function isCloseMatch(
  userAnswer: string,
  expectedAnswer: string,
): boolean {
  const normalizedUser = normalizeString(userAnswer);
  const normalizedExpected = normalizeString(expectedAnswer);

  if (normalizedUser === normalizedExpected) return true;
  if (normalizedUser.length === 0 || normalizedExpected.length === 0)
    return false;

  const distance = levenshteinDistance(normalizedUser, normalizedExpected);

  // Allow 1 typo for short words (<= 5 chars), 2 typos for longer words
  const maxDistance = normalizedExpected.length <= 5 ? 1 : 2;

  return distance <= maxDistance;
}
