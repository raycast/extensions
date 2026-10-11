import { extname } from "path";

export const AUDIO_EXTENSIONS = new Set([".aac", ".aif", ".aiff", ".caf", ".flac", ".m4a", ".mp3", ".ogg", ".wav"]);
export const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const NOISE_WORDS = new Set([
  "aac",
  "affirmation",
  "affirmations",
  "affipill",
  "aif",
  "aiff",
  "art",
  "artwork",
  "audio",
  "avif",
  "bmp",
  "caf",
  "cover",
  "final",
  "flac",
  "folder",
  "front",
  "gif",
  "heic",
  "image",
  "img",
  "jpeg",
  "jpg",
  "m4a",
  "master",
  "mix",
  "mp3",
  "ogg",
  "pill",
  "png",
  "poster",
  "rubipill",
  "song",
  "tif",
  "tiff",
  "track",
  "version",
  "wav",
  "webp",
]);

export type MatchKind = "exact" | "similar" | "ai" | "manual" | "none";

export function isAudioFile(path: string): boolean {
  return AUDIO_EXTENSIONS.has(extname(path).toLowerCase());
}

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

export function matchKindLabel(kind: MatchKind): string {
  switch (kind) {
    case "exact":
      return "Matched cover";
    case "similar":
      return "Similar name";
    case "ai":
      return "AI match";
    case "manual":
      return "Chosen cover";
    case "none":
      return "No cover";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function tokensFromStem(stem: string): string[] {
  return stem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._/\\-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !NOISE_WORDS.has(word));
}

export function normalizeStem(stem: string): string {
  return tokensFromStem(stem).join(" ");
}

export function metadataFromFilename(stem: string): { title: string; subtitle: string } {
  const readable = tokensFromStem(stem).join(" ") || stem.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const withoutTrackNumber = readable.replace(/^\d+[\s.)_-]+/, "").trim() || readable;
  const parts = withoutTrackNumber
    .split(/\s+[-–—]\s+/)
    .map((part) => titleCase(part))
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      title: parts[0],
      subtitle: parts.slice(1).join(" — "),
    };
  }

  const title = parts[0] ?? titleCase(readable);
  return { title, subtitle: title };
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase();
      if (lower.length >= 2 && lower.length <= 4 && !/[aeiou]/.test(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function diceCoefficient(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const bigrams = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index++) {
    const bigram = left.slice(index, index + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < right.length - 1; index++) {
    const bigram = right.slice(index, index + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      overlap += 1;
    }
  }

  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

export function tokenOverlap(audioStem: string, imageStem: string): number {
  const audioTokens = tokensFromStem(audioStem);
  const imageTokens = tokensFromStem(imageStem);

  if (audioTokens.length === 0 || imageTokens.length === 0) {
    return 0;
  }

  const audioSet = new Set(audioTokens);
  const imageSet = new Set(imageTokens);
  const shorter = audioTokens.length <= imageTokens.length ? audioTokens : imageTokens;
  const longer = audioTokens.length <= imageTokens.length ? imageSet : audioSet;

  if (shorter.every((token) => longer.has(token))) {
    return 0.96;
  }

  const intersection = audioTokens.filter((token) => imageSet.has(token)).length;
  return intersection / Math.max(audioSet.size, imageSet.size);
}

export function similarityScore(
  audioStem: string,
  imageStem: string,
): { score: number; kind: Exclude<MatchKind, "none" | "manual"> } {
  if (audioStem.toLowerCase() === imageStem.toLowerCase()) {
    return { score: 1.1, kind: "exact" };
  }

  const audio = normalizeStem(audioStem);
  const image = normalizeStem(imageStem);

  if (!audio || !image) {
    return { score: 0, kind: "similar" };
  }

  if (audio === image) {
    return { score: 1, kind: "exact" };
  }

  const contained = audio.includes(image) || image.includes(audio);
  const overlap = contained ? Math.min(audio.length, image.length) / Math.max(audio.length, image.length) : 0;
  const tokens = tokenOverlap(audioStem, imageStem);
  const dice = diceCoefficient(audio, image);
  const score = Math.max(overlap, tokens, dice);

  return { score, kind: score >= 0.92 ? "exact" : "similar" };
}
