import { AI } from "@raycast/api";

/** A subtitle block: the lines kept verbatim (index, timing, headers) and the cue text to translate. */
type Block = {
  head: string[];
  text: string[];
};

const CHUNK_SIZE = 80;
const MAX_ATTEMPTS = 2;
/** Raycast AI allows about 10 requests a minute: space the chunk requests out. */
const MIN_REQUEST_INTERVAL_MS = 7_000;
/** How long to wait before retrying after a rate-limit error. */
const RATE_LIMIT_WAIT_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /rate.?limit|too many requests|429/i.test(message);
}

let lastRequestAt = 0;

/** `AI.ask` with spacing between calls and a pause-and-retry on rate-limit errors. */
async function askPaced(prompt: string): Promise<string> {
  for (let retry = 0; ; retry++) {
    const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      return await AI.ask(prompt, { creativity: "low" });
    } catch (error) {
      if (!isRateLimitError(error) || retry >= MAX_RATE_LIMIT_RETRIES) throw error;
      await sleep(RATE_LIMIT_WAIT_MS);
    }
  }
}

/** Splits SRT or WebVTT content into blocks. Blocks without a `-->` timing line (e.g. `WEBVTT`) have no text. */
export function parseSubtitles(content: string): Block[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      const timing = lines.findIndex((line) => line.includes("-->"));
      if (timing === -1) return { head: lines, text: [] };
      return { head: lines.slice(0, timing + 1), text: lines.slice(timing + 1) };
    });
}

export function buildSubtitles(blocks: Block[]): string {
  return `${blocks.map((block) => [...block.head, ...block.text].join("\n")).join("\n\n")}\n`;
}

function parseNumberedLines(answer: string, expected: number): string[] | undefined {
  const lines = new Map<number, string>();
  for (const raw of answer.split("\n")) {
    const match = raw.match(/^\s*\[?(\d+)\]?[.):\]]?\s+(.*)$/);
    if (match) lines.set(Number(match[1]), match[2].trim());
  }
  const result: string[] = [];
  for (let index = 1; index <= expected; index++) {
    const line = lines.get(index);
    if (line === undefined) return undefined;
    result.push(line);
  }
  return result;
}

async function translateChunk(cues: string[], language: string): Promise<string[]> {
  const numbered = cues.map((cue, index) => `${index + 1}. ${cue}`).join("\n");
  const prompt = `Translate each numbered subtitle line into ${language}.
Rules:
- Return exactly ${cues.length} lines, numbered 1 to ${cues.length}, in the same order, formatted as "<number>. <translation>".
- Translate the meaning naturally for subtitles and keep each line about as short as the original.
- Keep " / " separators where they appear (they mark line breaks).
- Output nothing else.

${numbered}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const answer = await askPaced(prompt);
    const parsed = parseNumberedLines(answer, cues.length);
    if (parsed) return parsed;
  }
  throw new Error("Raycast AI did not return one translation per subtitle. Try again or pick another language.");
}

/**
 * Translates the cue text of SRT/VTT content while keeping indexes and timecodes untouched.
 * Multi-line cues are joined with " / " for the model, then split back.
 */
export async function translateSubtitles(
  content: string,
  language: string,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const blocks = parseSubtitles(content);
  const cueBlocks = blocks.filter((block) => block.text.length > 0);
  const total = Math.ceil(cueBlocks.length / CHUNK_SIZE);

  for (let chunk = 0; chunk < total; chunk++) {
    onProgress?.(chunk, total);
    const slice = cueBlocks.slice(chunk * CHUNK_SIZE, (chunk + 1) * CHUNK_SIZE);
    const translated = await translateChunk(
      slice.map((block) => block.text.join(" / ")),
      language,
    );
    slice.forEach((block, index) => {
      block.text = translated[index].split(/\s+\/\s+/).filter(Boolean);
    });
  }
  onProgress?.(total, total);
  return buildSubtitles(blocks);
}

/** `en`-style code or a language name, turned into a short file suffix like `fr` or `spanish`. */
export function languageSuffix(language: string): string {
  return (
    language
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "translated"
  );
}
