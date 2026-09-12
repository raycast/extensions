export function chunkTextByCharacterLimit(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  return groupChunks(splitBySentence(trimmed), maxChars);
}

function splitBySentence(text: string): string[] {
  const parts = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g);
  if (!parts) return [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function splitByClause(text: string): string[] {
  const parts = text.match(/[^，,、；;：:]+[，,、；;：:]*/g);
  if (!parts) return [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function groupChunks(parts: string[], maxChars: number): string[] {
  return groupSegments(parts, maxChars, (part) => groupClauseChunks(splitByClause(part), maxChars))
    .map((c) => c.trim())
    .filter(Boolean);
}

function groupClauseChunks(parts: string[], maxChars: number): string[] {
  return groupSegments(parts, maxChars, (part) => forceBreakByChar(part, maxChars));
}

function groupSegments(parts: string[], maxChars: number, splitOversized: (part: string) => string[]): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    if (part.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitOversized(part));
      continue;
    }

    const combined = appendTextPart(current, part);
    if (combined.length > maxChars) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current = combined;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function forceBreakByChar(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const char of text) {
    if ((current + char).length > maxChars) {
      if (current) chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function appendTextPart(current: string, next: string): string {
  if (!current) return next;
  if (!needsBoundarySpace(current, next)) return current + next;
  return `${current} ${next}`;
}

function needsBoundarySpace(current: string, next: string): boolean {
  if (/\s$/.test(current) || /^\s/.test(next)) return false;
  if (/^[,.;:!?，。！？、；：]/.test(next)) return false;
  return /[A-Za-z0-9.!?)]$/.test(current) && /^[A-Za-z0-9("']/.test(next);
}
