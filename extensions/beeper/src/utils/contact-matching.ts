interface ChatMatch {
  id: string;
  title: string;
  service: string;
  accountID?: string;
  type?: string;
  lastActivity?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

export interface MatchResult {
  chat: ChatMatch;
  score: number;
  matchType: "exact" | "startsWith" | "contains" | "word" | "fuzzy";
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(
  query: string,
  target: string,
): { score: number; matchType: MatchResult["matchType"] } {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) {
    return { score: 1.0, matchType: "exact" };
  }

  if (t.startsWith(q)) {
    return { score: 0.95, matchType: "startsWith" };
  }

  if (t.includes(q)) {
    return { score: 0.85, matchType: "contains" };
  }

  const targetWords = t.split(/\s+/);
  for (const word of targetWords) {
    if (word === q) {
      return { score: 0.9, matchType: "word" };
    }
    if (word.startsWith(q)) {
      return { score: 0.8, matchType: "word" };
    }
  }

  const maxLen = Math.max(q.length, t.length);
  if (maxLen === 0) {
    return { score: 1.0, matchType: "exact" };
  }

  const dist = levenshteinDistance(q, t);
  let normalizedScore = 1 - dist / maxLen;

  if (q[0] === t[0]) {
    normalizedScore = Math.min(1, normalizedScore * 1.1);
  }

  return { score: normalizedScore, matchType: "fuzzy" };
}

export function rankChatMatches(
  chats: ChatMatch[],
  query: string,
  options?: {
    service?: string;
    minScore?: number;
    maxResults?: number;
  },
): MatchResult[] {
  const { service, minScore = 0.4, maxResults = 5 } = options || {};

  let matches = chats;

  if (service) {
    const targetService = service.toLowerCase();
    matches = matches.filter((chat) => chat.service.toLowerCase() === targetService);
  }

  const scoredMatches: MatchResult[] = matches.map((chat) => {
    const { score, matchType } = calculateSimilarity(query, chat.title);
    return { chat, score, matchType };
  });

  return scoredMatches
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export function getSuggestionMessage(query: string, topMatches: MatchResult[], service?: string): string {
  const servicePart = service ? ` on ${service}` : "";

  if (topMatches.length === 0) {
    return `No chat found matching "${query}"${servicePart}. Try a different name or check your connected services.`;
  }

  const suggestions = topMatches
    .slice(0, 3)
    .map((m) => `"${m.chat.title}"`)
    .join(", ");

  return `No exact match for "${query}"${servicePart}. Did you mean: ${suggestions}?`;
}
