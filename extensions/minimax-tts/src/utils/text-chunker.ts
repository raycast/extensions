const MAX_CHARS = 1400;

/**
 * Split text into small enough chunks for fast first playback.
 * The common Raycast use case is 1k-5k characters, so smaller chunks
 * reduce perceived latency and make chunk-level resume useful.
 */
export function chunkText(text: string, maxChars: number = MAX_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (getCharLength(trimmed) <= maxChars) {
    return [trimmed];
  }

  const paragraphs = splitByParagraph(trimmed);
  return groupChunks(paragraphs, maxChars);
}

export function getCharLength(text: string): number {
  return Array.from(text).length;
}

function splitByParagraph(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [text];
}

function splitBySentence(text: string): string[] {
  const parts = text.match(/[^。！？.!?；;\n]+[。！？.!?；;\n]*/g);
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

function forceBreakByChar(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const char of Array.from(text)) {
    const test = current + char;
    if (getCharLength(test) > maxChars) {
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

function groupChunks(parts: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const partLength = getCharLength(part);

    if (partLength > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      const sentences = splitBySentence(part);
      const subChunks = groupSentenceChunks(sentences, maxChars);
      chunks.push(...subChunks);
      continue;
    }

    const combined = current ? `${current}\n\n${part}` : part;
    if (getCharLength(combined) > maxChars) {
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

function groupSentenceChunks(sentences: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const sentenceLength = getCharLength(sentence);

    if (sentenceLength > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      const clauses = splitByClause(sentence);
      chunks.push(...groupClauseChunks(clauses, maxChars));
      continue;
    }

    const combined = current ? current + sentence : sentence;
    if (getCharLength(combined) > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function groupClauseChunks(clauses: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const clause of clauses) {
    const clauseLength = getCharLength(clause);

    if (clauseLength > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...forceBreakByChar(clause, maxChars));
      continue;
    }

    const combined = current ? current + clause : clause;
    if (getCharLength(combined) > maxChars) {
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
