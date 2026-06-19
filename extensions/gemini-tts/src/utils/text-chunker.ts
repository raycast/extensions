const MAX_CHARS = 1400;
const LEAD_MAX_CHARS = 260;
const LEAD_MIN_CHARS = 60;

/**
 * Split text into small enough chunks for fast first playback.
 * The common Raycast use case is 1k-5k characters, so smaller chunks
 * reduce perceived latency and make chunk-level resume useful.
 *
 * The first chunk is intentionally short (a "lead chunk", ~60-260 chars)
 * so first-audio latency is dominated by a small synthesis instead of a
 * full 1400-char request. The pipeline in reading-runner.ts then
 * synthesizes the next chunk in parallel with playback so the user
 * hears continuous audio after the lead.
 */
export function chunkText(text: string, maxChars: number = MAX_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  // Short enough that even synthesizing the whole thing is fast — no
  // benefit to carving a lead (the extra request would cost more than
  // it saves).
  if (getCharLength(trimmed) <= LEAD_MAX_CHARS) {
    return [trimmed];
  }

  // For everything longer, carve a small lead chunk so the first audio
  // arrives quickly. The pipeline will synthesize the tail in parallel
  // with playback of the lead.
  const { lead, rest } = carveLeadChunk(trimmed);
  if (!rest) {
    return lead ? [lead] : [];
  }

  const tail = getCharLength(rest) <= maxChars ? [rest] : groupChunks(splitByParagraph(rest), maxChars);
  return lead ? [lead, ...tail] : tail;
}

/**
 * Carve a small lead chunk off the front of `text` so the first
 * synthesis returns quickly. Prefers a clean sentence/paragraph
 * boundary inside [LEAD_MIN_CHARS, LEAD_MAX_CHARS]; falls back to a
 * hard cut at the last whitespace before LEAD_MAX_CHARS, then to a
 * blunt char-cut as a last resort.
 */
export function carveLeadChunk(text: string): { lead: string; rest: string } {
  const trimmed = text.trim();
  const total = getCharLength(trimmed);
  if (total === 0) return { lead: "", rest: "" };
  if (total <= LEAD_MAX_CHARS) return { lead: trimmed, rest: "" };

  const chars = Array.from(trimmed);
  const window = chars.slice(0, LEAD_MAX_CHARS).join("");

  const sentenceEnd = findLastBoundary(window, /[。！？.!?；;]/, LEAD_MIN_CHARS);
  if (sentenceEnd > 0) {
    return splitAt(chars, sentenceEnd + 1);
  }

  const clauseEnd = findLastBoundary(window, /[，,、：:\n]/, LEAD_MIN_CHARS);
  if (clauseEnd > 0) {
    return splitAt(chars, clauseEnd + 1);
  }

  const wsMatch = window.match(/.*\s/u);
  if (wsMatch && getCharLength(wsMatch[0]) >= LEAD_MIN_CHARS) {
    return splitAt(chars, getCharLength(wsMatch[0]));
  }

  return splitAt(chars, LEAD_MAX_CHARS);
}

function findLastBoundary(window: string, boundary: RegExp, minChars: number): number {
  const chars = Array.from(window);
  for (let i = chars.length - 1; i >= minChars - 1; i--) {
    if (boundary.test(chars[i])) {
      return i;
    }
  }
  return -1;
}

function splitAt(chars: string[], cut: number): { lead: string; rest: string } {
  const lead = chars.slice(0, cut).join("").trim();
  const rest = chars.slice(cut).join("").trim();
  return { lead, rest };
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
