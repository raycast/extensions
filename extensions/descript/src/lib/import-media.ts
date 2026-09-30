import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { lookup as lookupMime } from "mime-types";

import { descript } from "./client";
import type { ImportJobStart } from "./types";

// Audio + video extensions are "time-based" media — Descript can place them
// on the timeline as clips with a duration. These are the only ones we'll
// drop into an auto-created composition's `clips[]`.
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".aac", ".aiff", ".aif", ".ogg", ".flac"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);

// Image formats Descript accepts as project media (used as still layers,
// b-roll, thumbnails, etc.). Source: https://help.descript.com/hc/en-us/
// articles/10164098416909-Supported-file-types
const IMAGE_EXTENSIONS = new Set([".bmp", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);

const SUPPORTED_MEDIA_EXTENSIONS = new Set<string>([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]);

function fileExt(filePath: string): string {
  return extname(filePath).toLowerCase();
}

export function isLikelyMediaFile(filePath: string): boolean {
  return SUPPORTED_MEDIA_EXTENSIONS.has(fileExt(filePath));
}

/**
 * True for audio + video files only. Used when building the auto-composition
 * for a brand-new project: images can be imported as project media, but
 * adding them to a composition's `clips[]` would render them as still slots
 * on the timeline, which is almost never what someone wants when they
 * dragged a folder of mixed assets into Raycast.
 */
export function isTimeBasedMedia(filePath: string): boolean {
  const ext = fileExt(filePath);
  return AUDIO_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

type ResolvedFile = {
  filePath: string;
  fileName: string;
  contentType: string;
  fileSize: number;
};

async function resolveFiles(filePaths: string[]): Promise<ResolvedFile[]> {
  const resolved = await Promise.all(
    filePaths.map(async (filePath) => {
      const info = await stat(filePath);
      if (!info.isFile()) {
        throw new Error(`Not a file: ${filePath}`);
      }
      const fileName = basename(filePath);
      const contentType = lookupMime(filePath) || "application/octet-stream";
      return { filePath, fileName, contentType, fileSize: info.size };
    }),
  );

  const seen = new Map<string, number>();
  for (const file of resolved) {
    seen.set(file.fileName, (seen.get(file.fileName) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) {
      throw new Error(`Multiple selected files share the name "${name}". Rename them and try again.`);
    }
  }

  return resolved;
}

export type StartLocalFilesImportInput = {
  filePaths: string[];
  /** If provided, files are added to this existing project. */
  projectId?: string;
  /** Used when projectId is omitted (i.e. when creating a new project). */
  projectName?: string;
  /** Optional ISO 639-1 language code; leave blank for auto-detect. */
  language?: string;
  /** Whether to seed a "Main" composition for new projects. Defaults to true. */
  createComposition?: boolean;
};

export type RequestUploadUrlsInput = StartLocalFilesImportInput;

export type RequestedUploadFile = {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  signedUrl: string;
};

export type RequestUploadUrlsResult = {
  job: ImportJobStart;
  files: RequestedUploadFile[];
};

/**
 * Submits the import request to Descript and returns signed upload URLs for
 * each file, without uploading the bytes. Callers (e.g. the detached
 * uploader) are responsible for PUTing the file contents to the URLs.
 */
export async function requestUploadUrls(input: RequestUploadUrlsInput): Promise<RequestUploadUrlsResult> {
  const { filePaths, projectId, language, createComposition = true } = input;
  if (!filePaths.length) {
    throw new Error("No files to import.");
  }

  const files = await resolveFiles(filePaths);

  const addMedia: Record<string, unknown> = {};
  for (const file of files) {
    addMedia[file.fileName] = {
      content_type: file.contentType,
      file_size: file.fileSize,
      ...(language ? { language } : {}),
    };
  }

  const payload: Record<string, unknown> = { add_media: addMedia };

  if (projectId) {
    payload.project_id = projectId;
  } else {
    const fallbackName = stripExtension(files[0].fileName) || "Imported Media";
    payload.project_name = input.projectName?.trim() || fallbackName;
    if (createComposition) {
      // Only include time-based media in the auto-composition. Images uploaded
      // alongside still get added to the project's media library via
      // `add_media`, the user just won't see them on the timeline by default.
      const clipFiles = files.filter((file) => isTimeBasedMedia(file.filePath));
      if (clipFiles.length > 0) {
        payload.add_compositions = [
          {
            name: "Main",
            clips: clipFiles.map((file) => ({ media: file.fileName })),
          },
        ];
      }
    }
  }

  const job = await descript.startProjectMediaImport(payload);

  const enriched: RequestedUploadFile[] = files.map((file) => {
    const signedUrl = job.upload_urls?.[file.fileName]?.upload_url;
    if (!signedUrl) {
      throw new Error(`Descript did not return a signed upload URL for "${file.fileName}".`);
    }
    return { ...file, signedUrl };
  });

  return { job, files: enriched };
}

function stripExtension(name: string): string {
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}
