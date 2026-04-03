import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
// environment, fs, and path are used in uploadFile (Task 5)
import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);
const GWS_PATH = "/usr/local/bin/gws";

const DRIVE_ID = "0AABIqW8LZ0s-Uk9PVA";
const FOLDER_IDS: Record<"ROSTER" | "PROSPECTS", string> = {
  ROSTER: "1fcrCANdplb6u-x8z2auOh_YdvuP0FR81",
  PROSPECTS: "1onkq7mga3svHUx3wv5K_MCLFQNhKW6DW",
};

const GWS_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin${process.env.PATH ? `:${process.env.PATH}` : ""}`,
};

async function gws(
  args: string[],
  options?: { cwd?: string },
): Promise<unknown> {
  try {
    const { stdout } = await execFileAsync(GWS_PATH, args, {
      cwd: options?.cwd ?? process.cwd(),
      env: GWS_ENV,
    });
    return JSON.parse(stdout);
  } catch (err: unknown) {
    const error = err as {
      stdout?: string;
      stderr?: string;
      code?: string;
      message?: string;
    };
    if (error.code === "ENOENT") {
      throw new Error(
        "gws CLI not found — make sure it's installed at /usr/local/bin/gws",
      );
    }
    const errorOutput = error.stderr || error.stdout;
    if (errorOutput) {
      let message: string | undefined;
      try {
        const parsed = JSON.parse(errorOutput) as {
          error?: { message?: string };
        };
        message = parsed.error?.message;
      } catch {
        // not JSON — use raw output
        message = errorOutput.trim();
      }
      throw new Error(message || error.message || "gws command failed");
    }
    throw new Error((err as Error).message);
  }
}

export interface Artist {
  id: string;
  name: string;
}

// In-memory cache (Raycast restarts the process each invocation)
const artistCache: Partial<Record<"ROSTER" | "PROSPECTS", Artist[]>> = {};

export async function listArtists(
  folder: "ROSTER" | "PROSPECTS",
): Promise<Artist[]> {
  if (artistCache[folder]) return artistCache[folder]!;

  const result = (await gws([
    "drive",
    "files",
    "list",
    "--params",
    JSON.stringify({
      driveId: DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "drive",
      q: `"${FOLDER_IDS[folder]}" in parents and mimeType = "application/vnd.google-apps.folder"`,
      fields: "files(id,name)",
    }),
  ])) as { files: Array<{ id: string; name: string }> };

  const artists = result.files
    .map((f) => ({ id: f.id, name: f.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  artistCache[folder] = artists;
  return artists;
}

export async function getRecordingsFolderId(
  artistFolderId: string,
): Promise<string> {
  const result = (await gws([
    "drive",
    "files",
    "list",
    "--params",
    JSON.stringify({
      driveId: DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "drive",
      q: `"${artistFolderId}" in parents and mimeType = "application/vnd.google-apps.folder" and name = "RECORDINGS"`,
      fields: "files(id,name)",
    }),
  ])) as { files: Array<{ id: string; name: string }> };

  if (result.files.length === 0) {
    throw new Error(`No RECORDINGS folder found for this artist`);
  }
  return result.files[0].id;
}

export async function getOrCreateSongFolder(
  recordingsFolderId: string,
  songTitle: string,
): Promise<string> {
  const result = (await gws([
    "drive",
    "files",
    "list",
    "--params",
    JSON.stringify({
      driveId: DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "drive",
      q: `"${recordingsFolderId}" in parents and mimeType = "application/vnd.google-apps.folder"`,
      fields: "files(id,name)",
      pageSize: 1000,
    }),
  ])) as { files: Array<{ id: string; name: string }> };

  const existing = result.files.find(
    (f) => f.name.toLowerCase() === songTitle.toLowerCase(),
  );
  if (existing) return existing.id;

  const created = (await gws([
    "drive",
    "files",
    "create",
    "--json",
    JSON.stringify({
      name: songTitle,
      mimeType: "application/vnd.google-apps.folder",
      parents: [recordingsFolderId],
    }),
    "--params",
    JSON.stringify({ supportsAllDrives: true }),
  ])) as { id: string };

  return created.id;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".aiff": "audio/aiff",
    ".aif": "audio/aiff",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function uploadFile(
  filePath: string,
  fileName: string,
  parentFolderId: string,
): Promise<string> {
  // gws requires the upload file to be within the cwd
  const supportPath = environment.supportPath;
  const tempFileName = `${randomUUID()}-${fileName}`;
  const tempPath = path.join(supportPath, tempFileName);
  await fs.promises.copyFile(filePath, tempPath);

  try {
    const result = (await gws(
      [
        "drive",
        "files",
        "create",
        "--upload",
        tempFileName,
        "--upload-content-type",
        getMimeType(fileName),
        "--json",
        JSON.stringify({ name: fileName, parents: [parentFolderId] }),
        "--params",
        JSON.stringify({ supportsAllDrives: true }),
      ],
      { cwd: supportPath },
    )) as { id: string };

    return result.id;
  } finally {
    await fs.promises.unlink(tempPath).catch(() => undefined);
  }
}

export async function makePublic(fileId: string): Promise<void> {
  await gws([
    "drive",
    "permissions",
    "create",
    "--json",
    JSON.stringify({ role: "reader", type: "anyone" }),
    "--params",
    JSON.stringify({ fileId, supportsAllDrives: true }),
  ]);
}

export async function getShareLink(fileId: string): Promise<string> {
  const result = (await gws([
    "drive",
    "files",
    "get",
    "--params",
    JSON.stringify({ fileId, fields: "webViewLink", supportsAllDrives: true }),
  ])) as { webViewLink: string };

  return result.webViewLink;
}
