import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { copyFile, mkdir, unlink } from "fs/promises";
import { existsSync, statSync } from "fs";
import { basename, extname, join } from "path";
import { promisify } from "util";
import { environment, LocalStorage } from "@raycast/api";
import { metadataFromFilename } from "./filenames";
import { Track } from "./types";

const execFileAsync = promisify(execFile);

const TRACKS_KEY = "tracks";
const DURATION_PATTERN = /estimated duration:\s*([\d.]+)\s*sec/i;

async function getAudioDurationSeconds(audioPath: string): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync("afinfo", [audioPath]);
    const match = stdout.match(DURATION_PATTERN);
    if (!match) {
      return undefined;
    }

    const seconds = Number.parseFloat(match[1]);
    return Number.isFinite(seconds) ? seconds : undefined;
  } catch {
    return undefined;
  }
}

function getTracksDirectory(): string {
  return join(environment.supportPath, "tracks");
}

async function ensureTracksDirectory(): Promise<string> {
  const tracksDirectory = getTracksDirectory();
  await mkdir(tracksDirectory, { recursive: true });
  return tracksDirectory;
}

function isValidFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export async function getTracks(): Promise<Track[]> {
  const data = await LocalStorage.getItem<string>(TRACKS_KEY);
  if (!data) {
    return [];
  }

  try {
    const tracks = JSON.parse(data) as Track[];
    const availableTracks = tracks.filter((track) => isValidFile(track.audioPath));

    let didBackfillDuration = false;
    const tracksWithDuration = await Promise.all(
      availableTracks.map(async (track) => {
        if (track.durationSeconds !== undefined) {
          return track;
        }

        didBackfillDuration = true;
        return { ...track, durationSeconds: await getAudioDurationSeconds(track.audioPath) };
      }),
    );

    if (availableTracks.length !== tracks.length || didBackfillDuration) {
      await saveTracks(tracksWithDuration);
    }

    return tracksWithDuration.sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    await LocalStorage.removeItem(TRACKS_KEY);
    return [];
  }
}

async function saveTracks(tracks: Track[]): Promise<void> {
  await LocalStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
}

async function copyTrackFile(sourcePath: string, destinationPath: string): Promise<void> {
  if (!isValidFile(sourcePath)) {
    throw new Error("Selected file is missing or invalid.");
  }

  await copyFile(sourcePath, destinationPath);
}

async function removeFileIfExists(path?: string): Promise<void> {
  if (path && existsSync(path)) {
    await unlink(path);
  }
}

export type AddTrackInput = {
  title: string;
  subtitle?: string;
  audioSourcePath: string;
  coverSourcePath?: string;
};

export async function addTrack(input: AddTrackInput): Promise<Track> {
  const [track] = await addTracks([input]);
  return track;
}

function titleFromAudioPath(audioSourcePath: string): { title: string; subtitle: string } {
  return metadataFromFilename(basename(audioSourcePath, extname(audioSourcePath)));
}

async function createTrackFromInput(input: AddTrackInput, tracksDirectory: string): Promise<Track> {
  const id = randomUUID();
  const audioPath = join(tracksDirectory, `${id}${extname(input.audioSourcePath)}`);

  await copyTrackFile(input.audioSourcePath, audioPath);
  const durationSeconds = await getAudioDurationSeconds(audioPath);

  let coverPath: string | undefined;
  if (input.coverSourcePath) {
    coverPath = join(tracksDirectory, `${id}-cover${extname(input.coverSourcePath)}`);
    await copyTrackFile(input.coverSourcePath, coverPath);
  }

  return {
    id,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || undefined,
    audioPath,
    coverPath,
    createdAt: Date.now(),
    durationSeconds,
  };
}

export async function addTracks(inputs: AddTrackInput[]): Promise<Track[]> {
  if (inputs.length === 0) {
    return [];
  }

  const tracksDirectory = await ensureTracksDirectory();
  const newTracks = await Promise.all(inputs.map((input) => createTrackFromInput(input, tracksDirectory)));
  const tracks = await getTracks();

  tracks.unshift(...newTracks);
  await saveTracks(tracks);

  return newTracks;
}

export function createTrackInputsFromAudioFiles(
  audioSourcePaths: string[],
  subtitle?: string,
  coverSourcePath?: string,
): AddTrackInput[] {
  return audioSourcePaths.map((audioSourcePath, index) => {
    const derived = titleFromAudioPath(audioSourcePath);
    return {
      title: derived.title,
      subtitle: subtitle || derived.subtitle,
      audioSourcePath,
      coverSourcePath: index === 0 ? coverSourcePath : undefined,
    };
  });
}

type UpdateTrackInput = {
  title: string;
  subtitle?: string;
  audioSourcePath?: string;
  coverSourcePath?: string;
  removeCover?: boolean;
};

export async function updateTrack(id: string, input: UpdateTrackInput): Promise<Track> {
  const tracks = await getTracks();
  const trackIndex = tracks.findIndex((track) => track.id === id);

  if (trackIndex === -1) {
    throw new Error("Track not found.");
  }

  const existingTrack = tracks[trackIndex];
  const tracksDirectory = await ensureTracksDirectory();
  let audioPath = existingTrack.audioPath;
  let coverPath = existingTrack.coverPath;
  let durationSeconds = existingTrack.durationSeconds;

  if (input.audioSourcePath) {
    const nextAudioPath = join(tracksDirectory, `${id}${extname(input.audioSourcePath)}`);
    await copyTrackFile(input.audioSourcePath, nextAudioPath);
    if (existingTrack.audioPath !== nextAudioPath) {
      await removeFileIfExists(existingTrack.audioPath);
    }
    audioPath = nextAudioPath;
    durationSeconds = await getAudioDurationSeconds(audioPath);
  }

  if (input.coverSourcePath) {
    const nextCoverPath = join(tracksDirectory, `${id}-cover${extname(input.coverSourcePath)}`);
    await copyTrackFile(input.coverSourcePath, nextCoverPath);
    if (existingTrack.coverPath !== nextCoverPath) {
      await removeFileIfExists(existingTrack.coverPath);
    }
    coverPath = nextCoverPath;
  } else if (input.removeCover) {
    await removeFileIfExists(existingTrack.coverPath);
    coverPath = undefined;
  }

  const updatedTrack: Track = {
    ...existingTrack,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || undefined,
    audioPath,
    coverPath,
    durationSeconds,
  };

  tracks[trackIndex] = updatedTrack;
  await saveTracks(tracks);

  return updatedTrack;
}

export async function deleteTrack(id: string): Promise<void> {
  const tracks = await getTracks();
  const track = tracks.find((item) => item.id === id);

  if (!track) {
    return;
  }

  await removeFileIfExists(track.audioPath);
  await removeFileIfExists(track.coverPath);
  await saveTracks(tracks.filter((item) => item.id !== id));
}

export function getTrackById(tracks: Track[], id: string): Track | undefined {
  return tracks.find((track) => track.id === id);
}
