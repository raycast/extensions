const MAX_BYTES = 1024;

/**
 * Split text into chunks that fit within the byte limit.
 *
 * Strategy:
 * 1. Split by sentence-ending punctuation
 * 2. Accumulate sentences until near the byte limit
 * 3. For oversized sentences, split by clause punctuation
 * 4. Last resort: split by character
 */
export function chunkText(text: string, maxBytes: number = MAX_BYTES): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (getByteLength(trimmed) <= maxBytes) {
    return [trimmed];
  }

  const sentences = splitBySentence(trimmed);
  return groupChunks(sentences, maxBytes);
}

export function getByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function splitBySentence(text: string): string[] {
  const parts = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g);
  if (!parts) {
    return [text];
  }
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitByClause(sentence: string): string[] {
  const parts = sentence.match(/[^，,、；;：:]+[，,、；;：:]*/g);
  if (!parts) {
    return [sentence];
  }
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function forceBreakByChar(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const char of text) {
    const test = current + char;
    if (getByteLength(test) > maxBytes) {
      if (current) {
        chunks.push(current);
      }
      current = char;
    } else {
      current = test;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function groupChunks(parts: string[], maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const partBytes = getByteLength(part);

    if (partBytes > maxBytes) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      const clauses = splitByClause(part);
      const subChunks = groupClauseChunks(clauses, maxBytes);
      chunks.push(...subChunks);
      continue;
    }

    const combined = current ? current + part : part;
    if (getByteLength(combined) > maxBytes) {
      chunks.push(current);
      current = part;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

function groupClauseChunks(clauses: string[], maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const clause of clauses) {
    const clauseBytes = getByteLength(clause);

    if (clauseBytes > maxBytes) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...forceBreakByChar(clause, maxBytes));
      continue;
    }

    const combined = current ? current + clause : clause;
    if (getByteLength(combined) > maxBytes) {
      chunks.push(current);
      current = clause;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
