import { randomUUID } from "crypto";
import { readdir } from "fs/promises";
import { basename, extname, join } from "path";
import { existsSync, statSync } from "fs";
import { isAudioFile, isImageFile, MatchKind, metadataFromFilename, similarityScore } from "./filenames";
import type { AddTrackInput } from "./library";

const MATCH_THRESHOLD = 0.55;
const FALLBACK_THRESHOLD = 0.4;
const REUSE_THRESHOLD = 0.8;

export type ImportDraft = {
  id: string;
  audioPath: string;
  coverPath?: string;
  title: string;
  subtitle: string;
  matchKind: MatchKind;
};

type ImportFile = {
  path: string;
  stem: string;
};

export async function listFolderFiles(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => join(folderPath, entry.name));
}

export async function collectImportPaths(paths: string[]): Promise<string[]> {
  const collected: string[] = [];

  for (const path of paths) {
    if (isExistingDirectory(path)) {
      collected.push(...(await listFolderFiles(path)));
      continue;
    }

    collected.push(path);
  }

  return collected;
}

export async function prepareFolderImport(folderPath: string): Promise<ImportDraft[]> {
  return prepareFileImport(await listFolderFiles(folderPath));
}

export function prepareFileImport(paths: string[]): ImportDraft[] {
  const files = uniqueExistingFiles(paths);
  const audioFiles = files.filter((file) => isAudioFile(file.path));
  const imageFiles = files.filter((file) => isImageFile(file.path));

  if (audioFiles.length === 0) {
    throw new Error("Choose at least one audio file.");
  }

  const coversByAudio = matchCovers(audioFiles, imageFiles);

  return audioFiles.map((audio) => {
    const match = coversByAudio.get(audio.path);
    const { title, subtitle } = metadataFromFilename(audio.stem);

    return {
      id: randomUUID(),
      audioPath: audio.path,
      coverPath: match?.coverPath,
      title,
      subtitle,
      matchKind: match?.kind ?? "none",
    };
  });
}

export function unusedCoverPaths(drafts: ImportDraft[], coverPaths: string[]): string[] {
  const used = new Set(drafts.map((draft) => draft.coverPath).filter((path): path is string => Boolean(path)));
  return uniqueExistingFiles(coverPaths)
    .filter((file) => isImageFile(file.path) && !used.has(file.path))
    .map((file) => file.path);
}

export function draftsToTrackInputs(drafts: ImportDraft[]): AddTrackInput[] {
  return drafts.map((draft) => ({
    title: draft.title,
    subtitle: draft.subtitle,
    audioSourcePath: draft.audioPath,
    coverSourcePath: draft.coverPath,
  }));
}

function uniqueExistingFiles(paths: string[]): ImportFile[] {
  const seen = new Set<string>();
  const files: ImportFile[] = [];

  for (const path of paths) {
    if (seen.has(path) || !isExistingFile(path)) {
      continue;
    }

    seen.add(path);
    files.push({
      path,
      stem: basename(path, extname(path)),
    });
  }

  return files;
}

function isExistingFile(path: string): boolean {
  try {
    return statSync(path).isFile() && existsSync(path);
  } catch {
    return false;
  }
}

function isExistingDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function matchCovers(
  audioFiles: ImportFile[],
  imageFiles: ImportFile[],
): Map<string, { coverPath: string; kind: Exclude<MatchKind, "none" | "manual"> }> {
  const candidates = audioFiles.flatMap((audio) =>
    imageFiles.map((image) => {
      const { score, kind } = similarityScore(audio.stem, image.stem);
      return { audioPath: audio.path, coverPath: image.path, score, kind };
    }),
  );

  candidates.sort((left, right) => right.score - left.score);

  const matches = new Map<string, { coverPath: string; kind: Exclude<MatchKind, "none" | "manual"> }>();
  const usedCovers = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.score < MATCH_THRESHOLD) {
      break;
    }

    if (matches.has(candidate.audioPath) || usedCovers.has(candidate.coverPath)) {
      continue;
    }

    matches.set(candidate.audioPath, { coverPath: candidate.coverPath, kind: candidate.kind });
    usedCovers.add(candidate.coverPath);
  }

  const unmatchedAudio = audioFiles.filter((audio) => !matches.has(audio.path));
  const unusedImages = imageFiles.filter((image) => !usedCovers.has(image.path));

  for (const audio of unmatchedAudio) {
    const options = unusedImages
      .filter((image) => !usedCovers.has(image.path))
      .map((image) => ({ image, ...similarityScore(audio.stem, image.stem) }))
      .filter((option) => option.score >= FALLBACK_THRESHOLD)
      .sort((left, right) => right.score - left.score);

    const best = options[0];
    const runnerUp = options[1];
    if (!best) {
      continue;
    }

    if (runnerUp && best.score - runnerUp.score < 0.08) {
      continue;
    }

    matches.set(audio.path, { coverPath: best.image.path, kind: best.kind });
    usedCovers.add(best.image.path);
  }

  const stillUnmatched = audioFiles.filter((audio) => !matches.has(audio.path));
  for (const audio of stillUnmatched) {
    const options = imageFiles
      .map((image) => ({ image, ...similarityScore(audio.stem, image.stem) }))
      .filter((option) => option.score >= REUSE_THRESHOLD)
      .sort((left, right) => right.score - left.score);

    const best = options[0];
    if (!best) {
      continue;
    }

    matches.set(audio.path, { coverPath: best.image.path, kind: best.kind });
  }

  return matches;
}
