export const PARAGRAPH_BREAK = " ";

export interface Sentence {
  text: string;
  words: string[];
  startIndex: number;
  endIndex: number;
  image?: string;
  altText?: string;
}

export const IMAGE_PLACEHOLDER = "[IMG]";

export function isImageSentence(s: Sentence): boolean {
  return Boolean(s.image);
}

const SENTENCE_BOUNDARY = /([.!?]+["')\]]*\s+|\n\s*\n)/g;
const IMAGE_PARAGRAPH_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " [code block] ")
    .replace(/`[^`]*`/g, " [code] ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " [image] ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/\r/g, "");
}

function tokenizeWords(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);
}

const MIN_CHUNK_WORDS = 20;
const MAX_CHUNK_WORDS = 300;
const SOFT_BREAK_RATIO = 0.7;

function mergeSmallChunks(sentences: Sentence[]): Sentence[] {
  const out: Sentence[] = [];
  let pending: Sentence | null = null;

  const flush = () => {
    if (pending) {
      out.push(pending);
      pending = null;
    }
  };

  for (const s of sentences) {
    if (s.text === PARAGRAPH_BREAK || isImageSentence(s)) {
      flush();
      out.push(s);
      continue;
    }
    if (!pending) {
      pending = { ...s, words: s.words.slice() };
    } else {
      pending = {
        text: `${pending.text} ${s.text}`,
        words: pending.words.concat(s.words),
        startIndex: pending.startIndex,
        endIndex: s.endIndex,
      };
    }
    if (pending.words.length >= MIN_CHUNK_WORDS) flush();
  }
  flush();
  return out;
}

function splitLargeChunk(s: Sentence): Sentence[] {
  if (s.text === PARAGRAPH_BREAK || isImageSentence(s) || s.words.length <= MAX_CHUNK_WORDS) return [s];

  const out: Sentence[] = [];
  let bufWords: string[] = [];
  let bufStart = s.startIndex;
  const softThreshold = Math.floor(MAX_CHUNK_WORDS * SOFT_BREAK_RATIO);

  const emit = () => {
    if (bufWords.length === 0) return;
    out.push({
      text: bufWords.join(" "),
      words: bufWords.slice(),
      startIndex: bufStart,
      endIndex: bufStart + bufWords.length - 1,
    });
    bufStart += bufWords.length;
    bufWords = [];
  };

  for (let i = 0; i < s.words.length; i++) {
    const w = s.words[i];
    bufWords.push(w);
    const breakable = /[,;)]$/.test(w) || /^\(/.test(s.words[i + 1] ?? "");
    if (bufWords.length >= MAX_CHUNK_WORDS) {
      emit();
    } else if (bufWords.length >= softThreshold && breakable) {
      emit();
    }
  }
  emit();
  return out;
}

function rechunk(sentences: Sentence[]): Sentence[] {
  const merged = mergeSmallChunks(sentences);
  const split: Sentence[] = [];
  for (const s of merged) split.push(...splitLargeChunk(s));
  return split;
}

export function tokenize(markdown: string): { sentences: Sentence[]; words: string[] } {
  // Split on blank lines FIRST so we can detect image-only paragraphs before stripping.
  const paragraphs = markdown
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const rawSentences: Sentence[] = [];
  const allWords: string[] = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    const imgMatch = paragraph.match(IMAGE_PARAGRAPH_RE);

    if (imgMatch) {
      const startIndex = allWords.length;
      allWords.push(IMAGE_PLACEHOLDER);
      rawSentences.push({
        text: imgMatch[1] ? `[image: ${imgMatch[1]}]` : "[image]",
        words: [IMAGE_PLACEHOLDER],
        startIndex,
        endIndex: startIndex,
        image: imgMatch[2],
        altText: imgMatch[1] || undefined,
      });
    } else {
      const clean = stripMarkdown(paragraph);
      const parts = clean.split(SENTENCE_BOUNDARY);
      let buffer = "";

      const flush = () => {
        const trimmed = buffer.trim();
        if (!trimmed) return;
        const words = tokenizeWords(trimmed);
        if (words.length === 0) return;
        const startIndex = allWords.length;
        allWords.push(...words);
        rawSentences.push({
          text: trimmed,
          words,
          startIndex,
          endIndex: allWords.length - 1,
        });
        buffer = "";
      };

      for (const part of parts) {
        buffer += part;
        if (SENTENCE_BOUNDARY.test(part)) flush();
        SENTENCE_BOUNDARY.lastIndex = 0;
      }
      flush();
    }

    if (p < paragraphs.length - 1) {
      const startIndex = allWords.length;
      allWords.push(PARAGRAPH_BREAK);
      rawSentences.push({
        text: PARAGRAPH_BREAK,
        words: [PARAGRAPH_BREAK],
        startIndex,
        endIndex: startIndex,
      });
    }
  }

  return { sentences: rechunk(rawSentences), words: allWords };
}
